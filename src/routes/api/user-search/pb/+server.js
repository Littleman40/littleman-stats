// sveltes helper for returning json responses
import { json } from '@sveltejs/kit';

// our cache helpers
import { fnGetCached, fnSetCached } from '$lib/server/userSearchCache.js';

// no hesi leaderboard api base
const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg';

// no hesi profile api base, used to resolve no hesi username to steam id
const PROFILE_API_URL = 'https://api.nohesi.gg';



// called from GET() when type === 'username'; abortSignal lets the upstream fetch cancel if the client disconnects
async function fnResolveUsernameToSteamId(usernameQuery, abortSignal) {
  
  // fetches user profile from the api
  const profileResponse = await fetch(`${PROFILE_API_URL}/functions/user-profile/${encodeURIComponent(usernameQuery)}`, { signal: abortSignal });

  // error handling
  if (!profileResponse.ok) return { error: 'No No Hesi account found for that username.' };

  // parse profile api response
  const profileBody = await profileResponse.json();

  // extract any liked accounts
  const connectedProviders = profileBody?.data?.connected_providers ?? [];

  // find steam connection inside of linked accounts
  const steamProvider = connectedProviders.find((provider) => provider.provider === 'steam');

  // error handling
  if (!steamProvider?.id) return { error: 'This user has no linked Steam account.' };

  // returns steam id
  return { steamId: steamProvider.id };
}



// called by SvelteKit on GET /api/user-search/pb, fetched from fnHandleUserSearch() in src/routes/user-search/+page.svelte
export async function GET({ url, request }) {
  // extract the search query
  const rawQuery = url.searchParams.get('query')?.trim();

  // extract the query type - username or steam id
  const queryType = url.searchParams.get('type');

  // reject if its missing
  if (!rawQuery) return json({ error: 'Missing query parameter.' }, { status: 400 });

  // stores steam id
  let resolvedSteamId;

  try {
    // if user searched by username, we resolve that first
    if (queryType === 'username') {
      // cache key for username -> steam id
      const usernameCacheKey = `username:${rawQuery.toLowerCase()}`;

      // checks if its already been cached
      const cachedUsername = fnGetCached(usernameCacheKey);

      // uses cached username if its already been found
      if (cachedUsername) {
        resolvedSteamId = cachedUsername.steamId;

      // calls no hesi's api to find steam id
      } else {
        const resolveResult = await fnResolveUsernameToSteamId(rawQuery, request.signal);

        // error handling
        if (resolveResult.error) return json({ error: resolveResult.error }, { status: 404 });
        resolvedSteamId = resolveResult.steamId;
        fnSetCached(usernameCacheKey, { steamId: resolvedSteamId });
      }
    } else {
      // if searched by steam id, just use it
      resolvedSteamId = rawQuery;
    }

    // cache key for pb lookup
    const pbCacheKey = `pb:${resolvedSteamId}`;

    // checks if pb result is already cached
    const cachedPb = fnGetCached(pbCacheKey);

    // returns cached info if its there
    if (cachedPb) return json(cachedPb);

    // finds personal best
    const pbResponse = await fetch(`${LEADERBOARD_API_URL}/scores/${resolvedSteamId}`, { signal: request.signal });

    // error handling
    if (!pbResponse.ok) return json({ error: 'No player found with that Steam ID.' }, { status: 404 });

    const pbData = await pbResponse.json();

    // runs if no hesi returned an object with no score, treat as no PB recorded
    if (!pbData || (!pbData.score && pbData.score !== 0)) {
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
      team_names: pbData.mode === 'team' ? (teamData ?? []).map((teammate) => teammate.nohesi_name ?? '') : []
    };

    // final result structure
    const responseResult = { steamId: resolvedSteamId, profile };

    // stores pb in cache
    fnSetCached(pbCacheKey, responseResult);

    // returns response to client
    return json(responseResult);
  } catch (err) {
    // client disconnected so abort
    if (err?.name === 'AbortError') return new Response(null, { status: 499 });
    throw err;
  }
}
