import { json } from '@sveltejs/kit';
import { fnGetCached, fnSetCached } from '$lib/server/userSearchCache.js';

const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg';             // upstream leaderboard api base
const PROFILE_API_URL = 'https://api.nohesi.gg';                                    // upstream profile api base, used to resolve nohesi username to steam id

async function fnResolveUsernameToSteamId(usernameQuery, abortSignal) {             // called from GET() when type === 'username'; abortSignal lets the upstream fetch cancel if the client disconnects
  const profileResponse = await fetch(`${PROFILE_API_URL}/functions/user-profile/${encodeURIComponent(usernameQuery)}`, { signal: abortSignal });
  if (!profileResponse.ok) return { error: 'No No Hesi account found for that username.' };

  const profileBody = await profileResponse.json();
  const connectedProviders = profileBody?.data?.connected_providers ?? [];
  const steamProvider = connectedProviders.find((provider) => provider.provider === 'steam');

  if (!steamProvider?.id) return { error: 'This user has no linked Steam account.' };
  return { steamId: steamProvider.id };
}

export async function GET({ url, request }) {                                       // called by SvelteKit on GET /api/user-search/pb, fetched from fnHandleUserSearch() in src/routes/user-search/+page.svelte
  const rawQuery = url.searchParams.get('query')?.trim();
  const queryType = url.searchParams.get('type');

  if (!rawQuery) return json({ error: 'Missing query parameter.' }, { status: 400 });

  let resolvedSteamId;

  try {
    if (queryType === 'username') {
      const usernameCacheKey = `username:${rawQuery.toLowerCase()}`;
      const cachedUsername = fnGetCached(usernameCacheKey);
      if (cachedUsername) {
        resolvedSteamId = cachedUsername.steamId;
      } else {
        const resolveResult = await fnResolveUsernameToSteamId(rawQuery, request.signal);
        if (resolveResult.error) return json({ error: resolveResult.error }, { status: 404 });
        resolvedSteamId = resolveResult.steamId;
        fnSetCached(usernameCacheKey, { steamId: resolvedSteamId });
      }
    } else {
      resolvedSteamId = rawQuery;
    }

    const pbCacheKey = `pb:${resolvedSteamId}`;
    const cachedPb = fnGetCached(pbCacheKey);
    if (cachedPb) return json(cachedPb);

    const pbResponse = await fetch(`${LEADERBOARD_API_URL}/scores/${resolvedSteamId}`, { signal: request.signal });
    if (!pbResponse.ok) return json({ error: 'No player found with that Steam ID.' }, { status: 404 });

    const pbData = await pbResponse.json();
    if (!pbData || (!pbData.score && pbData.score !== 0)) {                         // upstream returned an object with no score, treat as no PB recorded
      return json({ error: 'This player has no personal best recorded yet.' }, { status: 404 });
    }

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

    const responseResult = { steamId: resolvedSteamId, profile };
    fnSetCached(pbCacheKey, responseResult);
    return json(responseResult);
  } catch (err) {
    if (err?.name === 'AbortError') return new Response(null, { status: 499 });     // client disconnected
    throw err;
  }
}
