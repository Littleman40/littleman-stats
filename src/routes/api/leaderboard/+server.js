import { json } from '@sveltejs/kit';                                             // sveltes helper for returning json responses
import { fnGetOrCreateCacheEntry, fnWaitForPage } from '$lib/server/leaderboardCache.js'; // import our cache functions

const RESPONSE_PAGE_SIZE = 20;                                                    // records returned per response page (must match leaderboardCache.js)

export async function GET({ url }) {                                              // called by SvelteKit on GET /api/leaderboard, name is required by the framework. fetched from fnLoadLeaderboardData() in src/routes/leaderboard/+page.svelte
  const filterName = url.searchParams.get('filter') ?? 'all';                     // gets the filter from the url, and defaults to all if none exist
  const pageNumber = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));  // reads page number and makes sure the page number is at least 1

  const cacheEntry = fnGetOrCreateCacheEntry(filterName);                         // gets cached leaderboard data for filter or starts the fetch
  await fnWaitForPage(cacheEntry, pageNumber);                                    // waits until enough leaderboard data had loaded for this page

  const sliceStart = (pageNumber - 1) * RESPONSE_PAGE_SIZE;                       // calculates the starting index for this page
  const sliceEnd = pageNumber * RESPONSE_PAGE_SIZE;                               // calculates the ending index for this page

  const responseRecords = cacheEntry.records.slice(sliceStart, sliceEnd).map((record) => ({ // takes all cached records, keeps only the records for this page, and then creates a cleaner object for the api response
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

  return json({                                                                     // sends the json back to the front end
    records: responseRecords,
    page: pageNumber,
    startRank: sliceStart + 1,
    hasNext: cacheEntry.complete ? sliceEnd < cacheEntry.records.length : true,
    hasPrev: pageNumber > 1,
    total: cacheEntry.complete ? cacheEntry.records.length : null
  });
}
