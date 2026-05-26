import { json } from '@sveltejs/kit';                                               // sveltes helper for returning json responses
import { fnGetCached, fnSetCached } from '$lib/server/userSearchCache.js';          // import our cache functions

const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg';             // no hesi leaderboard api base
const HISTORY_PAGE_SIZE = 50;                                                       // no hesi returns history in pages of 50

const INPUT_CODE_LABELS = {                                                         // no hesi returns input as a numeric code
  0: 'Wheel',
  1: 'Controller',
  2: 'Keyboard and Mouse'
};

function fnUnwrapHistoryResponse(outerBody) {                                       // no hesi returns { data: { scores, total, has_more, ... }, status: 'success' } so we get the inner data
  const innerData = outerBody.data;
  if (innerData != null && typeof innerData === 'object' && !Array.isArray(innerData)) {
    return innerData;
  }
  return outerBody;
}

async function fnFetchFullHistory(steamIdParam, runMode, abortSignal) {             // called from GET(), paginates through every page of the upstream history endpoint; abortSignal lets us bail mid-scrape when the client disconnects
  
  const allRunEntries = [];                                                         // stores fetched runs
  let pageOffset = 0;                                                               // page offset var

  while (true) {
    if (abortSignal?.aborted) break;                                                // short-circuit if the client cancelled while we were mid-paginate

    const historyResponse = await fetch(`${LEADERBOARD_API_URL}/scores/${runMode}/${steamIdParam}/history?offset=${pageOffset}`, { signal: abortSignal });  // requests a page of history data from api
    if (!historyResponse.ok) break;                                                 // stops if the api fails

    const historyBody = await historyResponse.json();                               // parse json response
    const historyData = fnUnwrapHistoryResponse(historyBody);                       // get inner data

    const rawEntries = historyData.scores ?? [];                                    // gets the raw entries 
    const pageEntries = Array.isArray(rawEntries) ? rawEntries : [];                // ensures entries are always an array

    for (const entry of pageEntries) {                                              // gets each run in the page
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

    if (!historyData.has_more) break;                                               // stop if there are no more pages
    pageOffset += HISTORY_PAGE_SIZE;
  }

  return allRunEntries;                                                             // return all history data
}

function fnComputeHistory(runEntries) {                                             // called from GET() collapses a runs array into the stats shown on the page
  if (!runEntries.length) return null;                                              // returns if there is no data

  const pointsOverTime = runEntries                                                 // sorts runs chronologically for the graph
    .map((run) => ({ submitted_at: run.submitted_at, score: run.score }))
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

  const trafficDistribution = {};
  const tracksDistribution = {};
  const inputDistribution = {};
  const carsTally = {};
  const runsByDay = {};
  let totalRunTime = 0;

  for (const run of runEntries) {                                                   // itterate though all runs
    
    // traffic type counter
    if (run.traffic_type) trafficDistribution[run.traffic_type] = (trafficDistribution[run.traffic_type] ?? 0) + 1; 
    
    // map type counter
    if (run.map) tracksDistribution[run.map] = (tracksDistribution[run.map] ?? 0) + 1;
    
    // input type counter
    const mappedInput = INPUT_CODE_LABELS[run.input];                               // null for unknown codes, skip rather than charting raw numbers
    if (mappedInput) inputDistribution[mappedInput] = (inputDistribution[mappedInput] ?? 0) + 1;
    
    // car type counter
    if (run.car_model) carsTally[run.car_model] = (carsTally[run.car_model] ?? 0) + 1;
    
    // run time counter
    if (run.run_time) totalRunTime += Number(run.run_time);
    
    // counts runs by day
    if (run.submitted_at) {
      const isoDay = run.submitted_at.slice(0, 10);                                 // YYYY-MM-DD prefix from the iso timestamp
      runsByDay[isoDay] = (runsByDay[isoDay] ?? 0) + 1;
    }
  }

  return {                                                                          // returns the data
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
  const steamIdParam = url.searchParams.get('steamid')?.trim();                     // extract steam id from search
  const runMode = url.searchParams.get('mode');                                     // extracts the mode - either solo or team

  if (!steamIdParam) return json({ error: 'Missing steamid parameter.' }, { status: 400 }); // rejects if no steam id
  if (runMode !== 'solo' && runMode !== 'team') {                                   // rejects invalid run modes
    return json({ error: 'Invalid mode. Use solo or team.' }, { status: 400 });
  }

  const historyCacheKey = `history:${runMode}:${steamIdParam}`;                   // cache key for this user
  const cachedHistory = fnGetCached(historyCacheKey);                             // checks if result already exists in the cahce history
  if (cachedHistory !== null) return json(cachedHistory);                         // returns cached history if its there

  try {                                                                           // fetch full history from api
    const runEntries = await fnFetchFullHistory(steamIdParam, runMode, request.signal); 
    if (request.signal.aborted) return new Response(null, { status: 499 });       // client disconnected mid-scrape, don't cache a partial result, just bail

    const history = fnComputeHistory(runEntries);                                 // gets stats
    const responseResult = { history };                                           // puts the history in the results
    fnSetCached(historyCacheKey, responseResult);                                 // stores the cache
    return json(responseResult);                                                  // returns the json
  } catch (err) {                                                                 // error handling
    if (err?.name === 'AbortError') return new Response(null, { status: 499 });
    throw err;
  }
}
