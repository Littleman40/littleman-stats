import { json } from '@sveltejs/kit';
import { fnGetCached, fnSetCached } from '$lib/server/userSearchCache.js';

const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg';             // upstream leaderboard api base
const HISTORY_PAGE_SIZE = 50;                                                       // upstream returns history in pages of 50

const INPUT_CODE_LABELS = {                                                         // upstream returns input as a numeric code
  0: 'Wheel',
  1: 'Controller',
  2: 'Keyboard and Mouse'
};

function fnUnwrapHistoryResponse(outerBody) {                                       // upstream returns { data: { scores, total, has_more, ... }, status: 'success' }
  const innerData = outerBody.data;
  if (innerData != null && typeof innerData === 'object' && !Array.isArray(innerData)) {
    return innerData;
  }
  return outerBody;
}

async function fnFetchFullHistory(steamIdParam, runMode, abortSignal) {             // called from GET(), paginates through every page of the upstream history endpoint; abortSignal lets us bail mid-scrape when the client disconnects
  const allRunEntries = [];
  let pageOffset = 0;

  while (true) {
    if (abortSignal?.aborted) break;                                                // short-circuit if the client cancelled while we were mid-paginate

    const historyResponse = await fetch(`${LEADERBOARD_API_URL}/scores/${runMode}/${steamIdParam}/history?offset=${pageOffset}`, { signal: abortSignal });
    if (!historyResponse.ok) break;

    const historyBody = await historyResponse.json();
    const historyData = fnUnwrapHistoryResponse(historyBody);

    const rawEntries = historyData.scores ?? historyData.results ?? historyData.entries ?? [];
    const pageEntries = Array.isArray(rawEntries) ? rawEntries : [];

    for (const entry of pageEntries) {
      allRunEntries.push({
        score: entry.score,
        car_model: entry.car_model,
        traffic_type: entry.traffic_type,
        map: entry.map,
        run_time: entry.run_time,
        submitted_at: entry.submitted_at,
        was_personal_best: entry.was_personal_best,
        input: entry.input                                                          // numeric input code (0=Wheel, 1=Controller, 2=Keyboard and Mouse) used to build the input distribution chart
      });
    }

    if (!historyData.has_more) break;
    pageOffset += HISTORY_PAGE_SIZE;
  }

  return allRunEntries;
}

function fnComputeHistory(runEntries) {                                             // called from GET() collapses a runs array into the aggregate stats shown on the page
  if (!runEntries.length) return null;

  const pointsOverTime = runEntries
    .map((run) => ({ submitted_at: run.submitted_at, score: run.score }))
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

  const trafficDistribution = {};
  const tracksDistribution = {};
  const inputDistribution = {};
  const carsTally = {};
  const runsByDay = {};
  let totalRunTime = 0;

  for (const run of runEntries) {
    if (run.traffic_type) trafficDistribution[run.traffic_type] = (trafficDistribution[run.traffic_type] ?? 0) + 1;
    if (run.map) tracksDistribution[run.map] = (tracksDistribution[run.map] ?? 0) + 1;
    const mappedInput = INPUT_CODE_LABELS[run.input];                               // null for unknown codes, skip rather than charting raw numbers
    if (mappedInput) inputDistribution[mappedInput] = (inputDistribution[mappedInput] ?? 0) + 1;
    if (run.car_model) carsTally[run.car_model] = (carsTally[run.car_model] ?? 0) + 1;
    if (run.run_time) totalRunTime += Number(run.run_time);
    if (run.submitted_at) {
      const isoDay = run.submitted_at.slice(0, 10);                                 // YYYY-MM-DD prefix from the iso timestamp
      runsByDay[isoDay] = (runsByDay[isoDay] ?? 0) + 1;
    }
  }

  return {
    points_over_time: pointsOverTime,
    traffic_distribution: trafficDistribution,
    tracks_distribution: tracksDistribution,
    input_distribution: inputDistribution,
    cars_tally: carsTally,
    avg_run_time: runEntries.length ? totalRunTime / runEntries.length : 0,
    most_runs_in_a_day: Math.max(0, ...Object.values(runsByDay))
  };
}

export async function GET({ url, request }) {                                       // called by SvelteKit on GET /api/user-search/history, fetched from fnHandleUserSearch() in src/routes/user-search/+page.svelte
  const steamIdParam = url.searchParams.get('steamid')?.trim();
  const runMode = url.searchParams.get('mode');

  if (!steamIdParam) return json({ error: 'Missing steamid parameter.' }, { status: 400 });
  if (runMode !== 'solo' && runMode !== 'team') {
    return json({ error: 'Invalid mode. Use solo or team.' }, { status: 400 });
  }

  const historyCacheKey = `history:${runMode}:${steamIdParam}`;
  const cachedHistory = fnGetCached(historyCacheKey);
  if (cachedHistory !== null) return json(cachedHistory);

  try {
    const runEntries = await fnFetchFullHistory(steamIdParam, runMode, request.signal);
    if (request.signal.aborted) return new Response(null, { status: 499 });         // client disconnected mid-scrape, don't cache a partial result, just bail

    const history = fnComputeHistory(runEntries);
    const responseResult = { history };
    fnSetCached(historyCacheKey, responseResult);
    return json(responseResult);
  } catch (err) {
    if (err?.name === 'AbortError') return new Response(null, { status: 499 });
    throw err;
  }
}
