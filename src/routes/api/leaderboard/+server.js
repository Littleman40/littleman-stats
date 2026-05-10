import { json } from '@sveltejs/kit';
import { getOrCreateEntry, waitForPage } from '$lib/server/leaderboardCache.js';

const PAGE_SIZE = 20;

export async function GET({ url }) {
  const filter = url.searchParams.get('filter') ?? 'all';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));

  const entry = getOrCreateEntry(filter);
  await waitForPage(entry, page);

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

  return json({
    records: slice,
    page,
    hasNext: entry.complete ? endIdx < entry.records.length : true,
    hasPrev: page > 1,
    total: entry.complete ? entry.records.length : null
  });
}
