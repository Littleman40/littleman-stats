import { json } from '@sveltejs/kit';                                               // sveltes helper for returning json responses
import { fnGetCached, fnSetCached } from '$lib/server/userSearchCache.js';          // our cache helpers

const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg';             // no hesi leaderboard api base
const PROFILE_API_URL = 'https://api.nohesi.gg';                                    // no hesi profile api base, used to resolve no hesi username to steam id

async function fnResolveUsernameToSteamId(usernameQuery, abortSignal) {             // called from GET() when type === 'username'; abortSignal lets the upstream fetch cancel if the client disconnects
  const profileResponse = await fetch(`${PROFILE_API_URL}/functions/user-profile/${encodeURIComponent(usernameQuery)}`, { signal: abortSignal }); // fetches user profile from the api
  if (!profileResponse.ok) return { error: 'No No Hesi account found for that username.' };   // error handling

  const profileBody = await profileResponse.json();                                 // parse profile api response
  const connectedProviders = profileBody?.data?.connected_providers ?? [];          // extract any liked accounts
  const steamProvider = connectedProviders.find((provider) => provider.provider === 'steam'); // find steam connection inside of linked accounts

  if (!steamProvider?.id) return { error: 'This user has no linked Steam account.' }; // error handling
  return { steamId: steamProvider.id };                                             // returns steam id
}

export async function GET({ url, request }) {                                       // called by SvelteKit on GET /api/user-search/pb, fetched from fnHandleUserSearch() in src/routes/user-search/+page.svelte
  const rawQuery = url.searchParams.get('query')?.trim();                           // extract the search query
  const queryType = url.searchParams.get('type');                                   // extract the query type - username or steam id

  if (!rawQuery) return json({ error: 'Missing query parameter.' }, { status: 400 }); // reject if its missing

  let resolvedSteamId;                                                              // stores steam id

  try {
    if (queryType === 'username') {                                                 // if user searched by username, we resolve that first
      const usernameCacheKey = `username:${rawQuery.toLowerCase()}`;                // cache key for username -> steam id
      const cachedUsername = fnGetCached(usernameCacheKey);                         // checks if its already been cached
      if (cachedUsername) {                                                         // uses cached username if its already been found
        resolvedSteamId = cachedUsername.steamId;
      } else {                                                                      // calls no hesi's api to find steam id
        const resolveResult = await fnResolveUsernameToSteamId(rawQuery, request.signal); 
        if (resolveResult.error) return json({ error: resolveResult.error }, { status: 404 });  // error handling
        resolvedSteamId = resolveResult.steamId;
        fnSetCached(usernameCacheKey, { steamId: resolvedSteamId });
      }
    } else {
      resolvedSteamId = rawQuery;                                                     // if searched by steam id, just use it
    }

    const pbCacheKey = `pb:${resolvedSteamId}`;                                       // cache key for pb lookup
    const cachedPb = fnGetCached(pbCacheKey);                                         // checks if pb result is already cached
    if (cachedPb) return json(cachedPb);                                              // returns cached info if its there

    const pbResponse = await fetch(`${LEADERBOARD_API_URL}/scores/${resolvedSteamId}`, { signal: request.signal }); // finds personal best
    if (!pbResponse.ok) return json({ error: 'No player found with that Steam ID.' }, { status: 404 }); // error handling

    const pbData = await pbResponse.json();
    if (!pbData || (!pbData.score && pbData.score !== 0)) {                         // runs if no hesi returned an object with no score, treat as no PB recorded
      return json({ error: 'This player has no personal best recorded yet.' }, { status: 404 });
    }


    // player run data
    const rankingData = pbData.ranking;
    const teamData = pbData.team;

    const profile = {
      steam_id: resolvedSteamId,
      nohesi_name: pbData.nohesi_name,
      nohesi_pfp: pbData.nohesi_pfp,
      score: pbData.score,
      combo: pbData.combo,
      run_time: pbData.run_time,
      car_model: pbData.car_model,
      map: pbData.map,
      traffic_type: pbData.traffic_type,
      server_name: pbData.server_name,
      input: pbData.input,
      updated_at: pbData.updated_at,
      tier_name: rankingData?.tier_name,
      rank_position: rankingData?.position,
      mode: pbData.mode,
      team_names: pbData.mode === 'team' ? (teamData ?? []).map((teammate) => teammate.nohesi_name ?? '') : [],
      total_runs: 0                                                                 // filled in by the totals endpoint after this returns
    };

    const responseResult = { steamId: resolvedSteamId, profile };                   // final result structure
    fnSetCached(pbCacheKey, responseResult);                                        // stores pb in cache
    return json(responseResult);                                                    // returns response to client
  } catch (err) {
    if (err?.name === 'AbortError') return new Response(null, { status: 499 });     // client disconnected so abort
    throw err;
  }
}
