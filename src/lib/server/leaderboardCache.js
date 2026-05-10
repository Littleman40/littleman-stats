const LEADERBOARD_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/scores';
const PAGE_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map();

export function applyFilter(record, filter) {
  switch (filter) {
    case 'crew': return record.mode === 'team';
    case 'solo': return record.mode === 'solo';
    case 'realistic':
      return record.mode === 'solo' && record.car_model?.toLowerCase().includes('realistic');
    default: return true; // 'all'
  }
}

function mapRecord(raw) {
  const base = {
    nohesi_name: raw.nohesi_name,
    nohesi_pfp: raw.nohesi_pfp,
    score: raw.score,
    combo: raw.combo,
    map: raw.map,
    traffic_type: raw.traffic_type,
    mode: raw.mode,
    car_model: raw.car_model,
    input: raw.input,
    camera_type: raw.camera_type,
    rank_position: raw.ranking?.position,
    tier_name: raw.ranking?.tier_name,
    team_names: raw.mode === 'team'
      ? (raw.team ?? []).map(m => m.nohesi_name)
      : []
  };
  return base;
}

function isStale(entry) {
  return Date.now() - entry.timestamp > CACHE_TTL_MS;
}

async function fetchAllInBackground(filter) {
  const entry = cache.get(filter);
  if (!entry) return;

  let offset = 0;

  try {
    while (true) {
      const res = await fetch(`${LEADERBOARD_URL}?offset=${offset}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`Leaderboard API ${res.status}`);
      const data = await res.json();

      const records = data.scores ?? data.data ?? [];
      for (const raw of records) {
        if (applyFilter(raw, filter)) {
          entry.records.push(mapRecord(raw));
        }
      }

      if (entry._resolve20 && entry.records.length >= 20) {
        entry._resolve20();
        entry._resolve20 = null;
      }

      const hasMore = data.metadata?.has_more ?? data.has_more ?? (records.length === PAGE_SIZE);
      if (!hasMore) break;
      offset += PAGE_SIZE;
    }
  } catch (err) {
    console.error(`Leaderboard cache fetch error (filter=${filter}):`, err);
  } finally {
    entry.complete = true;
    entry.fetching = false;
    if (entry._resolve20) {
      entry._resolve20();
      entry._resolve20 = null;
    }
  }
}

export function getOrCreateEntry(filter) {
  const existing = cache.get(filter);
  if (existing && !isStale(existing)) {
    return existing;
  }

  let resolveReady;
  const readyPromise = new Promise(resolve => { resolveReady = resolve; });

  const entry = {
    records: [],
    complete: false,
    fetching: true,
    timestamp: Date.now(),
    readyPromise,
    _resolve20: resolveReady
  };

  cache.set(filter, entry);

  fetchAllInBackground(filter);

  return entry;
}

export async function waitForPage(entry, page) {
  const endIdx = page * 20;

  if (page === 1) {
    await entry.readyPromise;
  } else {
    while (entry.records.length < endIdx && !entry.complete) {
      await new Promise(r => setTimeout(r, 150));
    }
  }
}
