import { json } from '@sveltejs/kit';                                               // sveltes helper for returning json responses
import { fnGetCached, fnSetCached } from '$lib/server/userSearchCache.js';          // our cache helpers

const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg';             // no hesis leaderboard api base

function fnUnwrapHistoryResponse(outerBody) {                                       // no hesi returns { data: { total, ... }, status: 'success' } so we extract it
  const innerData = outerBody.data;
  if (innerData != null && typeof innerData === 'object' && !Array.isArray(innerData)) {
    return innerData;
  }
  return outerBody;
}

export async function GET({ url, request }) {                                       // called by SvelteKit on GET /api/user-search/totals, fetched from fnHandleUserSearch() in src/routes/user-search/+page.svelte
  const steamIdParam = url.searchParams.get('steamid')?.trim();                     // extract steam id
  if (!steamIdParam) return json({ error: 'Missing steamid parameter.' }, { status: 400 }); // error handling

  const totalsCacheKey = `totals:${steamIdParam}`;                                  // cache key for this specific steam id
  const cachedTotals = fnGetCached(totalsCacheKey);                                 // checks if totals are already cached
  if (cachedTotals) return json(cachedTotals);                                      // return cached results if applicable

  try { 
    const [soloResponse, teamResponse] = await Promise.all([                        // fetch the first page of both history feeds in parallel, we only need the total count from each
      fetch(`${LEADERBOARD_API_URL}/scores/solo/${steamIdParam}/history?offset=0`, { signal: request.signal }),
      fetch(`${LEADERBOARD_API_URL}/scores/team/${steamIdParam}/history?offset=0`, { signal: request.signal })
    ]);

    let soloTotalCount = 0;                                                          // solo counter
    if (soloResponse.ok) {                                                           // parse solo data then extract the usable data and then counts the number of them
      const soloBody = await soloResponse.json();
      const soloData = fnUnwrapHistoryResponse(soloBody);
      soloTotalCount = typeof soloData.total === 'number' ? soloData.total : 0;
    }

    let teamTotalCount = 0;                                                          // team counter
    if (teamResponse.ok) {                                                           // parse team data then extract the usable data and then count the number of them
      const teamBody = await teamResponse.json();
      const teamData = fnUnwrapHistoryResponse(teamBody);
      teamTotalCount = typeof teamData.total === 'number' ? teamData.total : 0;
    }

    const responseResult = {                                                        // returns results
      total_runs: soloTotalCount + teamTotalCount,
      solo_total: soloTotalCount,
      team_total: teamTotalCount
    };
    fnSetCached(totalsCacheKey, responseResult);                                    // caches the result
    return json(responseResult);                                                    // returns the final results
  } catch (err) {
    if (err?.name === 'AbortError') return new Response(null, { status: 499 });     // client disconnected so abort
    throw err;
  }
}
