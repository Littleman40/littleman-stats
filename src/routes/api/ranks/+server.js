import { json } from '@sveltejs/kit';                                               // sveltes helper for returning json responses

const RANKS_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/ranks/thresholds';  // api endpoint containing rank threshold data
const CACHE_TTL_MS = 30 * 60 * 1000;                                                // cache lifetime, which is 30 minutes

let cachedData = null;                                                              // var to store the cached data
let cacheExpiresAt = 0;                                                             // var to store the time when cache becomes invalid

export async function GET() {                                                       // called by SvelteKit on GET /api/ranks; fetched from fnLoadRanks() in src/routes/littleman-timing/+page.svelte
  if (cachedData && Date.now() < cacheExpiresAt) {                                  // checks if cached data exists and hasnt expired
    return json(cachedData);                                                        // returns said cached data
  }

  try {                                                                             // attemps to fetch fresh data from no hesi api
    const response = await fetch(RANKS_API_URL);                                    // the fetch
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);      // checks if the request failed
    const data = await response.json();                                             // sets json response to data var
    cachedData = data;                                                              // saves data to var
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;                                     // saves the timestamp to var
    return json(data);                                                              // returns the json
  } catch {                                                                         // runs if api request failed
    if (cachedData) return json(cachedData);                                        // return stale data rather than an error if we have it
    return json({ error: 'Failed to load rank data.' }, { status: 503 });           // fail code
  }
}
