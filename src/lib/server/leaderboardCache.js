// upstream api endpoint
const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/scores';

// records per upstream api call, as per its pagination
const API_PAGE_SIZE = 100;

// 5 minutes - how long a cached filter is reused before refetching
const CACHE_TTL_MS = 5 * 60 * 1000;

// records returned to the client per response page (imported by src/routes/api/leaderboard/+server.js so both stay in sync)
export const RESPONSE_PAGE_SIZE = 20;

// how long fnWaitForPage sleeps between record-count checks
const POLL_INTERVAL_MS = 150;

const cacheByFilter = new Map();

function fnApplyFilter(rawRecord, filterName) {
  switch (filterName) {
    // 'crew' = team mode
    case 'crew': return rawRecord.mode === 'team';

    // 'solo' = solo mode
    case 'solo': return rawRecord.mode === 'solo';

    // 'realistic' = solo runs in a car whose model name contains 'realistic'
    case 'realistic':
      return rawRecord.mode === 'solo' && rawRecord.car_model?.toLowerCase().includes('realistic');

    // 'all' / unknown - keep everything
    default: return true;
  }
}

function fnMapRecord(rawRecord) {
  return {
    nohesi_name: rawRecord.nohesi_name,
    nohesi_pfp: rawRecord.nohesi_pfp,
    score: rawRecord.score,
    combo: rawRecord.combo,
    map: rawRecord.map,
    traffic_type: rawRecord.traffic_type,
    mode: rawRecord.mode,
    car_model: rawRecord.car_model,
    input: rawRecord.input,
    camera_type: rawRecord.camera_type,
    rank_position: rawRecord.ranking?.position,
    tier_name: rawRecord.ranking?.tier_name,

    // for team runs collect every teammate's name
    team_names: rawRecord.mode === 'team'
      ? (rawRecord.team ?? []).map((teammate) => teammate.nohesi_name)
      : []
  };
}

function fnIsCacheEntryStale(cacheEntry) {
  return Date.now() - cacheEntry.timestamp > CACHE_TTL_MS;
}

async function fnFetchAllInBackground(filterName) {
  const cacheEntry = cacheByFilter.get(filterName);
  if (!cacheEntry) return;

  let pageOffset = 0;

  try {
    // loop every upstream page until none remain
    while (true) {
      const upstreamResponse = await fetch(`${LEADERBOARD_API_URL}?offset=${pageOffset}&limit=${API_PAGE_SIZE}`);
      if (!upstreamResponse.ok) throw new Error(`Leaderboard API ${upstreamResponse.status}`);
      const responseBody = await upstreamResponse.json();

      // capture the leaderboard-wide run count from the first upstream page (same for every filter)
      if (cacheEntry.totalFilteredCount === null) {
        cacheEntry.totalFilteredCount = responseBody.metadata?.total_filtered_count ?? 0;

        // let the request handler proceed to its page-range check as soon as we know the total
        if (cacheEntry._resolveTotalKnown) {
          cacheEntry._resolveTotalKnown();
          cacheEntry._resolveTotalKnown = null;
        }
      }

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

      const totalFilteredCount = responseBody.metadata?.total_filtered_count ?? 0;
      const moreUpstreamPagesExist = pageOffset + upstreamRecords.length < totalFilteredCount;
      if (!moreUpstreamPagesExist) break;
      pageOffset += API_PAGE_SIZE;
    }
  } catch (fetchErr) {
    console.error(`Leaderboard cache fetch error (filter=${filterName}):`, fetchErr);
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

// called from GET() in src/routes/api/leaderboard/+server.js
export function fnGetOrCreateCacheEntry(filterName) {
  const existingEntry = cacheByFilter.get(filterName);
  if (existingEntry && !fnIsCacheEntryStale(existingEntry)) {
    return existingEntry;
  }

  let resolveFirstPageReady;
  const firstPageReadyPromise = new Promise((resolve) => { resolveFirstPageReady = resolve; });

  // resolves once the first upstream page reveals total_filtered_count
  let resolveTotalKnown;
  const totalKnownPromise = new Promise((resolve) => { resolveTotalKnown = resolve; });

  const freshCacheEntry = {
    records: [],
    complete: false,
    fetching: true,
    timestamp: Date.now(),

    // leaderboard-wide run count, populated by the first upstream fetch
    totalFilteredCount: null,
    readyPromise: firstPageReadyPromise,
    totalKnownPromise,
    _resolveFirstPageReady: resolveFirstPageReady,
    _resolveTotalKnown: resolveTotalKnown
  };

  cacheByFilter.set(filterName, freshCacheEntry);

  // kick off the background scrape; caller can await readyPromise
  fnFetchAllInBackground(filterName);

  return freshCacheEntry;
}

// called from GET() in src/routes/api/leaderboard/+server.js
export async function fnWaitForPage(cacheEntry, pageNumber) {
  const lastRecordIndex = pageNumber * RESPONSE_PAGE_SIZE;

  if (pageNumber === 1) {
    await cacheEntry.readyPromise;
  } else {
    // pages beyond 1 need enough records buffered; poll until ready or scrape completes
    while (cacheEntry.records.length < lastRecordIndex && !cacheEntry.complete) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}
