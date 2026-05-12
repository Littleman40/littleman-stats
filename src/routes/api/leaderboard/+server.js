import { json } from '@sveltejs/kit';
import { fnGetOrCreateCacheEntry, fnWaitForPage } from '$lib/server/leaderboardCache.js';

const RESPONSE_PAGE_SIZE = 20;                                                    // records returned per response page (must match leaderboardCache.js)

export async function GET({ url }) {                                              // called by SvelteKit on GET /api/leaderboard — name is required by the framework; fetched from fnLoadLeaderboardData() in src/routes/leaderboard/+page.svelte
  const filterName = url.searchParams.get('filter') ?? 'all';
  const pageNumber = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));

  const cacheEntry = fnGetOrCreateCacheEntry(filterName);                         // fetches in background if cold
  await fnWaitForPage(cacheEntry, pageNumber);                                    // wait until this page's records are buffered

  const sliceStart = (pageNumber - 1) * RESPONSE_PAGE_SIZE;
  const sliceEnd = pageNumber * RESPONSE_PAGE_SIZE;

  const responseRecords = cacheEntry.records.slice(sliceStart, sliceEnd).map((record) => ({
    rank_position: record.rank_position,
    nohesi_name: record.nohesi_name,
    nohesi_pfp: record.nohesi_pfp,
    score: record.score,
    combo: record.combo,
    map: record.map,
    traffic_type: record.traffic_type,
    mode: record.mode,
    car_model: record.car_model,
    input: record.input,
    tier_name: record.tier_name,
    team_names: record.team_names
  }));

  return json({
    records: responseRecords,
    page: pageNumber,
    startRank: sliceStart + 1,
    hasNext: cacheEntry.complete ? sliceEnd < cacheEntry.records.length : true,
    hasPrev: pageNumber > 1,
    total: cacheEntry.complete ? cacheEntry.records.length : null
  });
}
