// sveltes helper for returning json responses
import { json } from '@sveltejs/kit';

// import our cache functions and the shared response page size
import { fnGetOrCreateCacheEntry, fnWaitForPage, RESPONSE_PAGE_SIZE } from '$lib/server/leaderboardCache.js';



// called by SvelteKit on GET /api/leaderboard, name is required by the framework. fetched from fnLoadLeaderboardData() in src/routes/leaderboard/+page.svelte
export async function GET({ url }) {
  
  // gets the filter from the url, and defaults to all if none exist
  const filterName = url.searchParams.get('filter') ?? 'all';

  // reads page number and makes sure the page number is at least 1
  const pageNumber = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));

  // gets cached leaderboard data for filter or starts the fetch
  const cacheEntry = fnGetOrCreateCacheEntry(filterName);

  // wait only for the first upstream page so we know the leaderboard-wide run count
  await cacheEntry.totalKnownPromise;

  // hard page cap derived from total runs (20 records per page)
  const maxPage = Math.max(1, Math.ceil(cacheEntry.totalFilteredCount / RESPONSE_PAGE_SIZE));

  // reject out-of-range pages immediately instead of polling forever for records that cannot exist
  if (pageNumber > maxPage) {
    return json({ error: `Page ${pageNumber} is out of range. Maximum page is ${maxPage}.`, maxPage }, { status: 400 });
  }

  // waits until enough leaderboard data had loaded for this page
  await fnWaitForPage(cacheEntry, pageNumber);

  // calculates the starting index for this page
  const sliceStart = (pageNumber - 1) * RESPONSE_PAGE_SIZE;

  // calculates the ending index for this page
  const sliceEnd = pageNumber * RESPONSE_PAGE_SIZE;

  // takes all cached records, keeps only the records for this page, and then creates a cleaner object for the api response
  const responseRecords = cacheEntry.records.slice(sliceStart, sliceEnd).map((record) => ({
    rank_position: record.rank_position,
    nohesi_name: record.nohesi_name,
    nohesi_pfp: record.nohesi_pfp,
    score: record.score,
    combo: record.combo,
    map: record.map,
    traffic_type: record.traffic_type,
    prox_combo: record.prox_combo,
    car_model: record.car_model,
    input: record.input,
    tier_name: record.tier_name
  }));

  // sends the json back to the front end
  return json({
    records: responseRecords,
    page: pageNumber,
    startRank: sliceStart + 1,
    hasNext: cacheEntry.complete ? sliceEnd < cacheEntry.records.length : true,
    hasPrev: pageNumber > 1,
    total: cacheEntry.complete ? cacheEntry.records.length : null
  });
}
