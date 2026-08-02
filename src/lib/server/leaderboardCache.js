import { fnResolveMap } from '$lib/utils/maps.js';
import { fnNormaliseTrafficType } from '$lib/utils/formatters.js';

// upstream api host - season 7 gives every map its own leaderboard, so the map name goes on the end of this
const LEADERBOARD_API_BASE = 'https://leaderboard-06nkmjf5r0.nohesi.gg';

// records per upstream api call, as per its pagination
const API_PAGE_SIZE = 100;

// builds the per-map scores url for one page of results
function fnBuildMapUrl(mapApiName, pageOffset) {
  return `${LEADERBOARD_API_BASE}/scores/maps/${mapApiName}?offset=${pageOffset}&limit=${API_PAGE_SIZE}`;
}

// 5 minutes - how long a cached filter is reused before refetching
const CACHE_TTL_MS = 5 * 60 * 1000;

// records returned to the client per response page (imported by src/routes/api/leaderboard/+server.js so both stay in sync)
export const RESPONSE_PAGE_SIZE = 20;

// how long fnWaitForPage sleeps between record-count checks
const POLL_INTERVAL_MS = 150;

// stores cached leaderboard data for each map + filter combination
const cacheByFilter = new Map();

// each map has its own board now, so the cache key has to include the map
function fnBuildCacheKey(mapSlug, filterName) {
  return `${mapSlug}:${filterName}`;
}


// applies the filter to a raw record - every entry is one player now, so crew vs solo comes from prox_combo
function fnApplyFilter(rawRecord, filterName) {
  switch (filterName) {
    // 'crew' = ran alongside other players, shown by a proximity combo above 1
    case 'crew': return Number(rawRecord.prox_combo) > 1;

    // 'solo' = no proximity combo, meaning they ran alone
    case 'solo': return Number(rawRecord.prox_combo) <= 1;

    // 'realistic' = any run (crew or solo) in a car whose model name contains 'realistic'
    case 'realistic':
      const model = rawRecord.car_model;
      if (!model) return false;
      return model.toLowerCase().includes('realistic');

    // 'all' / unknown - keep everything
    default: return true;
  }
}



// converts the api data into a cleaned format for the front end
function fnMapRecord(rawRecord) {
  return {
    nohesi_name: rawRecord.nohesi_name,
    nohesi_pfp: rawRecord.nohesi_pfp || rawRecord.steam_pfp || null,
    score: rawRecord.score,
    combo: rawRecord.combo,
    run_time: rawRecord.run_time,

    // folded onto one label so 'heavy' and 'Heavy Traffic' don't show up as two different things
    traffic_type: fnNormaliseTrafficType(rawRecord.traffic_type),
    prox_combo: rawRecord.prox_combo,
    car_model: rawRecord.car_model,
    input: rawRecord.input,
    camera_type: rawRecord.camera_type,
    rank_position: rawRecord.ranking?.position,
    tier_name: rawRecord.ranking?.tier_name
  };
}



// cache checker to see if its expired
function fnIsCacheEntryStale(cacheEntry) {
  return Date.now() - cacheEntry.timestamp > CACHE_TTL_MS;
}



// downloads all leaderboard pages for one map in background and fills the cache
async function fnFetchAllInBackground(mapSlug, filterName) {

  // if there was no cache entry, just exit
  const cacheEntry = cacheByFilter.get(fnBuildCacheKey(mapSlug, filterName));
  if (!cacheEntry) return;

  // the map name the api expects on the end of the scores url
  const mapApiName = fnResolveMap(mapSlug).apiName;

  // start with first page
  let pageOffset = 0;

  try {
    // loop every upstream page until none remain
    while (true) {

      // fetch 100 records starting from the offset
      const upstreamResponse = await fetch(fnBuildMapUrl(mapApiName, pageOffset));

      // if api fails throw error
      if (!upstreamResponse.ok) throw new Error(`Leaderboard API ${upstreamResponse.status}`);

      // convert the response to json
      const responseBody = await upstreamResponse.json();

      // capture the map-wide run count from the first upstream page (same for every filter on this map)
      if (cacheEntry.totalRunCount === null) {
        cacheEntry.totalRunCount = responseBody.metadata?.total ?? 0;

        // let the request handler proceed to its page-range check as soon as we know the total
        if (cacheEntry._resolveTotalKnown) {
          cacheEntry._resolveTotalKnown();
          cacheEntry._resolveTotalKnown = null;
        }
      }

      // apply the filter to each record we just scraped
      const upstreamRecords = responseBody.data ?? [];
      for (const rawRecord of upstreamRecords) {
        if (fnApplyFilter(rawRecord, filterName)) {
          cacheEntry.records.push(fnMapRecord(rawRecord));
        }
      }

      // once we have a full first response page, let any waiter on readyPromise proceed
      if (cacheEntry._resolveFirstPageReady && cacheEntry.records.length >= RESPONSE_PAGE_SIZE) {
        cacheEntry._resolveFirstPageReady();
        cacheEntry._resolveFirstPageReady = null;
      }

      // an empty page means there is nothing left to walk, so stop rather than loop forever
      if (upstreamRecords.length === 0) break;

      // the per-map api tells us directly whether another page exists
      const totalRunCount = responseBody.metadata?.total ?? 0;
      const moreUpstreamPagesExist = responseBody.metadata?.has_more ?? (pageOffset + upstreamRecords.length < totalRunCount);
      if (!moreUpstreamPagesExist) break;
      pageOffset += API_PAGE_SIZE;
    }

  } catch (fetchErr) {
    console.error(`Leaderboard cache fetch error (map=${mapSlug} filter=${filterName}):`, fetchErr);

  } finally {
    cacheEntry.complete = true;
    cacheEntry.fetching = false;

    // resolve even if we never hit a full page (rare empty/short result)
    if (cacheEntry._resolveFirstPageReady) {
      cacheEntry._resolveFirstPageReady();
      cacheEntry._resolveFirstPageReady = null;
    }

    // release page-range waiters even if the very first fetch failed before setting the total
    if (cacheEntry._resolveTotalKnown) {
      cacheEntry._resolveTotalKnown();
      cacheEntry._resolveTotalKnown = null;
    }
  }
}



// gets cache if its valid, otherwise creates it - called from GET() in src/routes/api/leaderboard/+server.js
export function fnGetOrCreateCacheEntry(mapSlug, filterName) {

  // gets cached entry for this map + filter pair
  const cacheKey = fnBuildCacheKey(mapSlug, filterName);
  const existingEntry = cacheByFilter.get(cacheKey);

  // if one exists then return it
  if (existingEntry && !fnIsCacheEntryStale(existingEntry)) {
    return existingEntry;
  }

  // creates promise that resolved once the first page is finished
  let resolveFirstPageReady;
  const firstPageReadyPromise = new Promise((resolve) => { resolveFirstPageReady = resolve; });

  // resolves once the first upstream page reveals the map's total run count
  let resolveTotalKnown;
  const totalKnownPromise = new Promise((resolve) => { resolveTotalKnown = resolve; });

  const freshCacheEntry = {
    records: [],
    complete: false,
    fetching: true,
    timestamp: Date.now(),

    // map-wide run count, populated by the first upstream fetch
    totalRunCount: null,
    readyPromise: firstPageReadyPromise,
    totalKnownPromise,
    _resolveFirstPageReady: resolveFirstPageReady,
    _resolveTotalKnown: resolveTotalKnown
  };

  // stores in cache
  cacheByFilter.set(cacheKey, freshCacheEntry);

  // kick off the background scrape; caller can await readyPromise
  fnFetchAllInBackground(mapSlug, filterName);

  // returns cache
  return freshCacheEntry;
}



// waits until enough data exists for the requested page - called from GET() in src/routes/api/leaderboard/+server.js
export async function fnWaitForPage(cacheEntry, pageNumber) {
  const lastRecordIndex = pageNumber * RESPONSE_PAGE_SIZE;

  // first page waits for the minimum data
  if (pageNumber === 1) {
    await cacheEntry.readyPromise;
  } else {
    
    // pages beyond 1 need enough records buffered; poll until ready or scrape completes
    while (cacheEntry.records.length < lastRecordIndex && !cacheEntry.complete) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}
