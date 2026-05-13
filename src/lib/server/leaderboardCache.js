const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/scores';    // upstream api endpoint
const API_PAGE_SIZE = 100;                                                        // records per upstream api call, as per its pagination
const CACHE_TTL_MS = 5 * 60 * 1000;                                               // 5 minutes — how long a cached filter is reused before refetching
const RESPONSE_PAGE_SIZE = 20;                                                    // records returned to the client per response page
const POLL_INTERVAL_MS = 150;                                                     // how long fnWaitForPage sleeps between record-count checks

const cacheByFilter = new Map();

export function fnApplyFilter(rawRecord, filterName) {
  switch (filterName) {
    case 'crew': return rawRecord.mode === 'team';                                // 'crew' = team mode
    case 'solo': return rawRecord.mode === 'solo';                                // 'solo' = solo mode
    case 'realistic':                                                             // 'realistic' = solo runs in a car whose model name contains 'realistic'
      return rawRecord.mode === 'solo' && rawRecord.car_model?.toLowerCase().includes('realistic');
    default: return true;                                                         // 'all' / unknown — keep everything
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
    team_names: rawRecord.mode === 'team'                                         // for team runs collect every teammate's name
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
    while (true) {                                                                                  // loop every upstream page until none remain
      const upstreamResponse = await fetch(`${LEADERBOARD_API_URL}?offset=${pageOffset}&limit=${API_PAGE_SIZE}`);
      if (!upstreamResponse.ok) throw new Error(`Leaderboard API ${upstreamResponse.status}`);
      const responseBody = await upstreamResponse.json();

      const upstreamRecords = responseBody.data ?? [];
      for (const rawRecord of upstreamRecords) {
        if (fnApplyFilter(rawRecord, filterName)) {
          cacheEntry.records.push(fnMapRecord(rawRecord));
        }
      }

      if (cacheEntry._resolveFirstPageReady && cacheEntry.records.length >= RESPONSE_PAGE_SIZE) {   // once we have a full first response page, let any waiter on readyPromise proceed
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
    if (cacheEntry._resolveFirstPageReady) {                                                        // resolve even if we never hit a full page (rare empty/short result)
      cacheEntry._resolveFirstPageReady();
      cacheEntry._resolveFirstPageReady = null;
    }
  }
}

export function fnGetOrCreateCacheEntry(filterName) {                                               // called from GET() in src/routes/api/leaderboard/+server.js
  const existingEntry = cacheByFilter.get(filterName);
  if (existingEntry && !fnIsCacheEntryStale(existingEntry)) {
    return existingEntry;
  }

  let resolveFirstPageReady;
  const firstPageReadyPromise = new Promise((resolve) => { resolveFirstPageReady = resolve; });

  const freshCacheEntry = {
    records: [],
    complete: false,
    fetching: true,
    timestamp: Date.now(),
    readyPromise: firstPageReadyPromise,
    _resolveFirstPageReady: resolveFirstPageReady
  };

  cacheByFilter.set(filterName, freshCacheEntry);

  fnFetchAllInBackground(filterName);                                                               // kick off the background scrape; caller can await readyPromise

  return freshCacheEntry;
}

export async function fnWaitForPage(cacheEntry, pageNumber) {                                       // called from GET() in src/routes/api/leaderboard/+server.js
  const lastRecordIndex = pageNumber * RESPONSE_PAGE_SIZE;

  if (pageNumber === 1) {
    await cacheEntry.readyPromise;
  } else {                                                                                          // pages beyond 1 need enough records buffered; poll until ready or scrape completes
    while (cacheEntry.records.length < lastRecordIndex && !cacheEntry.complete) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}
