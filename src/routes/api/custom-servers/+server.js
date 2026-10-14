// sveltes helper for returning json responses
import { json } from '@sveltejs/kit';

// the servers-catalog endpoint sends no cors headers, so the browser cannot call it and we proxy it here.
// only the community (custom) servers are used, the catalog's official list is stale
const CATALOG_URL = 'https://api.nohesi.gg/servers-catalog';

// called by SvelteKit on GET /api/custom-servers
export async function GET() {
  try {
    const response = await fetch(CATALOG_URL, {
      headers: { 'user-agent': 'littleman-stats (unofficial community tool)' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Catalog responded ' + response.status);

    const { data } = await response.json();

    // only keep what the page needs, owner ids and avatars are deliberately dropped
    const servers = (data.customServers ?? []).map((server) => ({
      endpoint: server.ip_address,
      name: server.name,
      region: server.region,
      map: server.map,
      traffic: server.density,
      players: server.clients,
      maxPlayers: server.maxclients,
      owner: server.owner,
      cars: [...new Set((server.carSlots ?? []).map((slot) => slot.model))].filter((model) => !model.includes('_traffic_'))
    }));

    // vercel's cache means many visitors share one upstream call
    return json({ servers }, { headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=120' } });
  } catch (error) {
    // the page treats this as "no custom servers" rather than breaking
    return json({ servers: [], error: error.message }, { status: 502 });
  }
}
