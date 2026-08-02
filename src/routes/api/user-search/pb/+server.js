// sveltes helper for returning json responses
import { json } from '@sveltejs/kit';

// our cache helpers
import { fnGetCached, fnSetCached } from '$lib/server/userSearchCache.js';

// season 7 gives every map its own board, so a player can hold a pb on any combination of them
import { MAP_OPTIONS } from '$lib/utils/maps.js';

// keeps traffic labelled the same way here as on the leaderboard and the charts
import { fnNormaliseTrafficType } from '$lib/utils/formatters.js';

// no hesi leaderboard api base
const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg';



// fetches one map's pb for a player. the same endpoint accepts either a no hesi username or a steam id, so no separate lookup is needed
async function fnFetchMapPb(playerQuery, mapOption, abortSignal) {

  const pbResponse = await fetch(
    `${LEADERBOARD_API_URL}/scores/${encodeURIComponent(playerQuery)}?map=${mapOption.apiName}`,
    { signal: abortSignal }
  );

  // a 404 just means no run on this map, which is normal - the player may still have runs on the other two
  if (pbResponse.status === 404) return null;

  // any other failure is a real problem, so it gets surfaced rather than being shown as 'no run on this map'
  if (!pbResponse.ok) throw new Error(`Leaderboard API ${pbResponse.status} for map ${mapOption.apiName}`);

  const pbData = await pbResponse.json();

  // an entry carrying no score isn't a real run
  if (!pbData || (!pbData.score && pbData.score !== 0)) return null;

  return pbData;
}



// called by SvelteKit on GET /api/user-search/pb, fetched from fnHandleUserSearch() in src/routes/user-search/+page.svelte
export async function GET({ url, request }) {

  // extract the search query - either a no hesi username or a steam id
  const rawQuery = url.searchParams.get('query')?.trim();

  // reject if its missing
  if (!rawQuery) return json({ error: 'Missing query parameter.' }, { status: 400 });

  // cache key for the whole three-map lookup
  const pbCacheKey = `pb-maps:${rawQuery.toLowerCase()}`;

  // returns cached info if its there
  const cachedPb = fnGetCached(pbCacheKey);
  if (cachedPb) return json(cachedPb);

  try {

    // every map is checked at once so one slow board doesn't hold up the others
    const mapResults = await Promise.all(
      MAP_OPTIONS.map((mapOption) => fnFetchMapPb(rawQuery, mapOption, request.signal))
    );

    // nothing on any board means we can't tell the player apart from one that doesn't exist, so both get the same message
    const firstFound = mapResults.find((mapResult) => mapResult !== null);
    if (firstFound === undefined) {
      return json({ error: 'No personal bests found for that player.' }, { status: 404 });
    }

    // the player's identity is the same on every board, so it comes from whichever map answered
    const identity = {
      steam_id: firstFound.steamid ?? null,
      nohesi_name: firstFound.nohesi_name ?? null,
      nohesi_pfp: firstFound.nohesi_pfp || firstFound.steam_pfp || null
    };

    // every map keeps an entry, in a fixed order, so the identity card can show a blank section for maps with no run
    const maps = MAP_OPTIONS.map((mapOption, mapIndex) => {
      const pbData = mapResults[mapIndex];

      if (pbData === null) {
        return { slug: mapOption.slug, label: mapOption.label, has_pb: false };
      }

      return {
        slug: mapOption.slug,
        label: mapOption.label,
        has_pb: true,
        rank_position: pbData.ranking?.position ?? pbData.rank_position ?? null,
        tier_name: pbData.ranking?.tier_name ?? null,
        score: pbData.score,
        combo: pbData.combo,
        run_time: pbData.run_time,
        car_model: pbData.car_model,
        map: pbData.map,
        traffic_type: fnNormaliseTrafficType(pbData.traffic_type),
        server_name: pbData.server_name,
        input: pbData.input,
        updated_at: pbData.updated_at
      };
    });

    // final result structure
    const responseResult = { identity, maps };

    // stores the lookup in cache
    fnSetCached(pbCacheKey, responseResult);

    // returns response to client
    return json(responseResult);
  } catch (err) {
    // client disconnected so abort
    if (err?.name === 'AbortError') return new Response(null, { status: 499 });
    throw err;
  }
}
