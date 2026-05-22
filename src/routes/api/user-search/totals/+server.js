import { json } from '@sveltejs/kit';
import { fnGetCached, fnSetCached } from '$lib/server/userSearchCache.js';

const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg';             // upstream leaderboard api base

function fnUnwrapHistoryResponse(outerBody) {                                       // upstream returns { data: { total, ... }, status: 'success' }
  const innerData = outerBody.data;
  if (innerData != null && typeof innerData === 'object' && !Array.isArray(innerData)) {
    return innerData;
  }
  return outerBody;
}

export async function GET({ url, request }) {                                       // called by SvelteKit on GET /api/user-search/totals, fetched from fnHandleUserSearch() in src/routes/user-search/+page.svelte
  const steamIdParam = url.searchParams.get('steamid')?.trim();
  if (!steamIdParam) return json({ error: 'Missing steamid parameter.' }, { status: 400 });

  const totalsCacheKey = `totals:${steamIdParam}`;
  const cachedTotals = fnGetCached(totalsCacheKey);
  if (cachedTotals) return json(cachedTotals);

  try { 
    const [soloResponse, teamResponse] = await Promise.all([                        // fetch the first page of both history feeds in parallel, we only need the total count from each
      fetch(`${LEADERBOARD_API_URL}/scores/solo/${steamIdParam}/history?offset=0`, { signal: request.signal }),
      fetch(`${LEADERBOARD_API_URL}/scores/team/${steamIdParam}/history?offset=0`, { signal: request.signal })
    ]);

    let soloTotalCount = 0;
    if (soloResponse.ok) {
      const soloBody = await soloResponse.json();
      const soloData = fnUnwrapHistoryResponse(soloBody);
      soloTotalCount = typeof soloData.total === 'number' ? soloData.total : 0;
    }

    let teamTotalCount = 0;
    if (teamResponse.ok) {
      const teamBody = await teamResponse.json();
      const teamData = fnUnwrapHistoryResponse(teamBody);
      teamTotalCount = typeof teamData.total === 'number' ? teamData.total : 0;
    }

    const responseResult = {
      total_runs: soloTotalCount + teamTotalCount,
      solo_total: soloTotalCount,
      team_total: teamTotalCount
    };
    fnSetCached(totalsCacheKey, responseResult);
    return json(responseResult);
  } catch (err) {
    if (err?.name === 'AbortError') return new Response(null, { status: 499 });     // client disconnected
    throw err;
  }
}
