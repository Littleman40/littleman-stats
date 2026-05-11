const LEADERBOARD_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/scores';    // a constant holding for the api endpoint
const PAGE_SIZE = 100;                                                        // the amount of records per api call, as per pagination
const CACHE_TTL_MS = 5 * 60 * 1000;                                           // 5 minutes in milliseconds for the amount of time before it refreshes the data

const cache = new Map();                                                     

export function applyFilter(record, filter) {                                 // This applies the filter to raw data for filtering
  switch (filter) {
    case 'crew': return record.mode === 'team';                               // if team is the mode, then assign it as crew filter
    case 'solo': return record.mode === 'solo';                               // if solo is the mode, then assign it as solo filter
    case 'realistic':                                                         // if the car model has the word realistic inside it, then assign it as realistic filter
      return record.mode === 'solo' && record.car_model?.toLowerCase().includes('realistic'); // since crew can have both realistic and non realistic cars, we only take solo runs
    default: return true;                                                     // default to no filter if they dont fit any - which should be impossible anyway
  }
}

function mapRecord(raw) {                                                     // takes the raw data from the api and reshapes it into a clean object
  const base = {
    nohesi_name: raw.nohesi_name,
    nohesi_pfp: raw.nohesi_pfp,
    score: raw.score,
    combo: raw.combo,
    map: raw.map,
    traffic_type: raw.traffic_type,
    mode: raw.mode,
    car_model: raw.car_model,
    input: raw.input,
    camera_type: raw.camera_type,
    rank_position: raw.ranking?.position,
    tier_name: raw.ranking?.tier_name,
    team_names: raw.mode === 'team'                                         // takes the different player names if its a team run - just how the api from no hesi is given to us
      ? (raw.team ?? []).map(m => m.nohesi_name)
      : []
  };
  return base;
}

function isStale(entry) {                                                   // checks whether a cached entry has expired from the TTL above
  return Date.now() - entry.timestamp > CACHE_TTL_MS;
}

async function fetchAllInBackground(filter) {                             // fetches every page of results in the background
  const entry = cache.get(filter);                                        // look up the cache entry for this filter and if it doesnt exist just exit
  if (!entry) return;

  let offset = 0;                                                         // pagination

  try {
    while (true) {                                                                            // infinite loop to get all data
      const res = await fetch(`${LEADERBOARD_URL}?offset=${offset}&limit=${PAGE_SIZE}`);      // fetch data for current page and pause until it arrives
      if (!res.ok) throw new Error(`Leaderboard API ${res.status}`);                          // if the response is not a 200 (ok response) then throw error
      const data = await res.json();                                                          // parse the response body into json

      const records = data.data ?? [];                                                        // returns the data array from the response above
      for (const raw of records) {                                                            // for all records, apply the filter using the function above, and then map the records via the function above too
        if (applyFilter(raw, filter)) {
          entry.records.push(mapRecord(raw));
        }
      }

      if (entry._resolve20 && entry.records.length >= 20) {                                    // once we have 20 records then resolve so the first page can show the data
        entry._resolve20();
        entry._resolve20 = null;
      }

      const total = data.metadata?.total_filtered_count ?? 0;                                   // the total records that are in the api
      const hasMore = offset + records.length < total;                                          // checks if we have more pages to scrape
      if (!hasMore) break;                                                                      // will exit loop if so, otherwise offets the offset
      offset += PAGE_SIZE;

    }
  } catch (err) {
    console.error(`Leaderboard cache fetch error (filter=${filter}):`, err);
  } finally {
    entry.complete = true;                                                // fetching complete
    entry.fetching = false;
    if (entry._resolve20) {                                               // if we never hit 20 records still resolve
      entry._resolve20();
      entry._resolve20 = null;
    }
  }
}

export function getOrCreateEntry(filter) {                                // function to get or create cache for a specified filter
  const existing = cache.get(filter);                                     // look up current entry and if we have one and it hasnt expired just return it
  if (existing && !isStale(existing)) {
    return existing;
  }

  let resolveReady;                                                       // resolve function that the client will wait for to know when records are finished - needs to be this way as its completed in a different function
  const readyPromise = new Promise(resolve => { resolveReady = resolve; });

  const entry = {                                                         // entry object to store the cache for this filter
    records: [], 
    complete: false,
    fetching: true,
    timestamp: Date.now(),
    readyPromise,
    _resolve20: resolveReady
  };

  cache.set(filter, entry);                                               // sets the cache for this

  fetchAllInBackground(filter);                                           // starts the background fetching

  return entry;                                                           // return immediately so the caller can start waiting on readyPromise
}

export async function waitForPage(entry, page) {                          // function to wait for a specific page of results before showing it
  const endIdx = page * 20;                                               // 20 records per page, and calculate the index of the last

  if (page === 1) {
    await entry.readyPromise;
  } else {                                                                // for pages other than 1, we wait until we have enough records to show, otherwise we wait
    while (entry.records.length < endIdx && !entry.complete) {
      await new Promise(r => setTimeout(r, 150));
    }
  }
}
