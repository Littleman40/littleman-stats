import { json } from '@sveltejs/kit';
import { getOrCreateEntry, waitForPage } from '$lib/server/leaderboardCache.js';

const PAGE_SIZE = 20;                                                             // how many records to show per page

export async function GET({ url }) {                                              // api/leaderboard endpoint
  const filter = url.searchParams.get('filter') ?? 'all';                         // reads the ?filter
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));    // reads the ?page - but defaults to 1 if missing

  const entry = getOrCreateEntry(filter);                                         // gets the cache entry for this filter - which will also fetch it if its not cached
  await waitForPage(entry, page);                                                 // pauses to wait until enough records are available to show this page

  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = page * PAGE_SIZE;

  const slice = entry.records.slice(startIdx, endIdx).map(r => ({
    rank_position: r.rank_position,
    nohesi_name: r.nohesi_name,
    nohesi_pfp: r.nohesi_pfp,
    score: r.score,
    combo: r.combo,
    map: r.map,
    traffic_type: r.traffic_type,
    mode: r.mode,
    car_model: r.car_model,
    input: r.input,
    tier_name: r.tier_name,
    team_names: r.team_names
  }));

  return json({                                                                // returns json will the following properties
    records: slice,
    page,
    startRank: startIdx + 1,
    hasNext: entry.complete ? endIdx < entry.records.length : true,
    hasPrev: page > 1,
    total: entry.complete ? entry.records.length : null
  });
}
