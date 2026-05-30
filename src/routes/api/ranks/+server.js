// sveltes helper for returning json responses
import { json } from '@sveltejs/kit';

// api endpoint containing rank threshold data
const RANKS_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/ranks/thresholds';

// cache lifetime, which is 30 minutes
const CACHE_TTL_MS = 30 * 60 * 1000;

// var to store the cached data
let cachedData = null;

// var to store the time when cache becomes invalid
let cacheExpiresAt = 0;

// called by SvelteKit on GET /api/ranks; fetched from fnLoadRanks() in src/routes/ranks/+page.svelte
export async function GET() {
  // checks if cached data exists and hasnt expired
  if (cachedData && Date.now() < cacheExpiresAt) {
    // returns said cached data
    return json(cachedData);
  }

  // attemps to fetch fresh data from no hesi api
  try {
    // the fetch
    const response = await fetch(RANKS_API_URL);

    // checks if the request failed
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);

    // sets json response to data var
    const data = await response.json();

    // saves data to var
    cachedData = data;

    // saves the timestamp to var
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;

    // returns the json
    return json(data);

  // runs if api request failed
  } catch {
    // return stale data rather than an error if we have it
    if (cachedData) return json(cachedData);

    // fail code
    return json({ error: 'Failed to load rank data.' }, { status: 503 });
  }
}
