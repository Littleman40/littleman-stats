import { json } from '@sveltejs/kit';

const RANKS_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/ranks/thresholds';
const CACHE_TTL_MS = 30 * 60 * 1000;

let cachedData = null;
let cacheExpiresAt = 0;

export async function GET() {                                                      // called by SvelteKit on GET /api/ranks; fetched from fnLoadRanks() in src/routes/littleman-timing/+page.svelte
  if (cachedData && Date.now() < cacheExpiresAt) {
    return json(cachedData);
  }

  try {
    const response = await fetch(RANKS_API_URL);
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    const data = await response.json();
    cachedData = data;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return json(data);
  } catch {
    if (cachedData) return json(cachedData);                                       // return stale data rather than an error if we have it
    return json({ error: 'Failed to load rank data.' }, { status: 503 });
  }
}
