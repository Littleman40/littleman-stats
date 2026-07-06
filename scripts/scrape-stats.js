// adds ability to save text to a file, and create a folder
import { writeFileSync, mkdirSync } from 'node:fs';

// returns file paths and builds absolute paths from parts
import { dirname, resolve } from 'node:path';

import process from 'node:process';

// no hesi url we are scraping
const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/scores';

// how many records per page
const API_PAGE_SIZE = 100;

// prints a progress line in console after this many pagers
const PROGRESS_EVERY_N_PAGES = 10;

// if a request fails, we retry it 3 times
const RETRY_ATTEMPTS = 3;

// how long we wait before each retry to give the server a break
const RETRY_BACKOFF_MS = [1000, 2000, 4000];

// set to something when testing so not everything gets scraped
const TEST_MAX_PAGES = null;

// saves the json file to where the process was run, which is what process.cwd does
const OUTPUT_PATH = resolve(process.cwd(), 'static', 'stats.json');

// the rank breakdown is written to the same static dir so the frontend can fetch it directly, just like stats.json
const RANKS_OUTPUT_PATH = resolve(process.cwd(), 'static', 'ranks.json');

// every rank tier from best to worst - used to seed and order the rank breakdown so even an empty tier still shows up in the right spot
const RANK_TIER_ORDER = [
  { rank: 'Certified',  tier: 0 },
  { rank: 'Sanctioned', tier: 3 },
  { rank: 'Sanctioned', tier: 2 },
  { rank: 'Sanctioned', tier: 1 },
  { rank: 'Ghost',      tier: 3 },
  { rank: 'Ghost',      tier: 2 },
  { rank: 'Ghost',      tier: 1 },
  { rank: 'Licensed',   tier: 3 },
  { rank: 'Licensed',   tier: 2 },
  { rank: 'Licensed',   tier: 1 },
  { rank: 'Marked',     tier: 3 },
  { rank: 'Marked',     tier: 2 },
  { rank: 'Marked',     tier: 1 },
  { rank: 'Noticed',    tier: 3 },
  { rank: 'Noticed',    tier: 2 },
  { rank: 'Noticed',    tier: 1 },
  { rank: 'Listed',     tier: 3 },
  { rank: 'Listed',     tier: 2 },
  { rank: 'Listed',     tier: 1 }
];

// all the different buckets the leaderboard records can belong to
const FILTER_NAMES = ['all', 'crew', 'solo', 'realistic'];

// no hesi ranks
const KNOWN_BASE_RANKS = new Set([
  'Listed',
  'Noticed',
  'Marked',
  'Licensed',
  'Ghost',
  'Sanctioned',
  'Certified'
]);

// the amount of buckets in the histogram. runs max out at 3 minutes (180s) this series, so 6 buckets of 30 seconds each
const RUN_TIME_BUCKET_COUNT = 6;

// seconds covered by each run time bucket
const RUN_TIME_BUCKET_SECONDS = 30;

// caps how many crew scatter points get saved - the api is ordered by score, so this keeps the top crew runs and stops stats.json ballooning
const PROX_SCATTER_MAX_POINTS = 5000;

// creates empty buckets at the start of each scrape for each fo the 4 filter buckets
function fnCreateEmptyAggregations(filterName) {
  const aggregations = {
    total_runs: 0,
    mode_split: {
      solo: 0,
      crew: 0
    },

    map_distribution: {},
    input_distribution: {},
    traffic_distribution: {},
    cars_tally: {},
    tyre_compound_distribution: {},
    camera_distribution: {},

    run_time_histogram: new Array(RUN_TIME_BUCKET_COUNT).fill(0)
  };

  // rank histogram is only used by the all, solo, and realistic filter views
  if (filterName !== 'crew') {
    aggregations.rank_histogram = {};
    for (const rankName of KNOWN_BASE_RANKS) {
      aggregations.rank_histogram[rankName] = { crew: 0, solo: 0 };
    }
  }

  // the crew view plots each crew run as a prox_time vs prox_combo scatter point
  if (filterName === 'crew') {
    aggregations.prox_scatter = [];
  }

  return aggregations;
}

// filters each record into the buckets they need to go into - they can go into multiple
function fnGetMatchingFilters(rawRecord) {
  // every record will go into the all bucket
  const matches = ['all'];

  // every entry is a single player now, so crew vs solo comes from the proximity combo - above 1 means they ran with other players
  if (Number(rawRecord.prox_combo) > 1) {
    matches.push('crew');

  // otherwise it will be a solo run
  } else {
    matches.push('solo');
  }

  // as long as car_model is a string then we check to see if it has the word realistic inside it, and if so, add it to the realistic bucket. this now covers both crew and solo runs since every entry is just one person and one car
  if (typeof rawRecord.car_model === 'string') {
    const carModelLowercase = rawRecord.car_model.toLowerCase();
    if (carModelLowercase.includes('realistic')) {
      matches.push('realistic');
    }
  }

  return matches;
}

// stripping numbers/ the tier of the rank to get the base ranks
function fnExtractBaseRank(rawRecord) {
  let tierName;

  // tier name can be found inside ranking in the returned json from no hesi - so this is the safety check
  if (rawRecord.ranking !== undefined && rawRecord.ranking !== null) {
    tierName = rawRecord.ranking.tier_name;
  } else {
    tierName = undefined;
  }

  // if its null or not a string we just return null. never should happen
  if (typeof tierName !== 'string' || tierName.length === 0) {
    return null;
  }

  // split the word by white space, and then we take the first part of it as the base rank
  const parts = tierName.split(/\s+/);
  const baseRank = parts[0];

  return baseRank;
}

// builds the combined tier label used as the bucket key - certified has no number suffix, every other tier does
function fnBuildTierName(rankName, tier) {
  if (tier === 0) {
    return rankName;
  }
  return rankName + ' ' + tier;
}

// creates the empty rank breakdown - one bucket per tier, pre-seeded in best-to-worst order
function fnCreateEmptyRankTotals() {
  const rankTotals = {};
  for (const entry of RANK_TIER_ORDER) {
    const tierName = fnBuildTierName(entry.rank, entry.tier);
    rankTotals[tierName] = {
      rank: entry.rank,
      tier: entry.tier,
      player_count: 0,
      min_score: null,
      lowest_position: null
    };
  }
  return rankTotals;
}

// folds one record into the rank breakdown - counts players in the tier, and tracks the lowest score and the worst (highest) position seen
function fnBumpRankTotals(rankTotals, rawRecord, seenPositions) {
  // everything we need lives in the ranking block
  const ranking = rawRecord.ranking;
  if (ranking === undefined || ranking === null) {
    return;
  }

  const dedupePosition = Number(ranking.position);
  if (Number.isFinite(dedupePosition) && dedupePosition > 0) {
    if (seenPositions.has(dedupePosition)) {
      return;
    }
    seenPositions.add(dedupePosition);
  }

  // tier_name is the key we bucket by, e.g. "Sanctioned 2"
  const tierName = ranking.tier_name;
  if (typeof tierName !== 'string' || tierName.length === 0) {
    return;
  }

  // ignore anything that isn't one of the known tiers we seeded
  const bucket = rankTotals[tierName];
  if (bucket === undefined) {
    return;
  }

  // one more player in this tier
  bucket.player_count += 1;

  // lowest score in the tier becomes the rank's minimum score
  const score = Number(rawRecord.score);
  if (Number.isFinite(score) && score > 0) {
    if (bucket.min_score === null || score < bucket.min_score) {
      bucket.min_score = score;
    }
  }

  // worst (largest) position in the tier is the rank's lowest position
  const position = Number(ranking.position);
  if (Number.isFinite(position) && position > 0) {
    if (bucket.lowest_position === null || position > bucket.lowest_position) {
      bucket.lowest_position = position;
    }
  }
}

// the function that creates the stats for each record
function fnBumpAggregations(agg, rawRecord) {
  // add a count to the total runs on the lb
  agg.total_runs += 1;

  // split our record into crew or solo - a proximity combo above 1 means they ran with other players
  let modeKey;
  if (Number(rawRecord.prox_combo) > 1) {
    modeKey = 'crew';
  } else {
    modeKey = 'solo';
  }

  // tally the mode
  agg.mode_split[modeKey] += 1;

  // add record to the rank histogram - only present on filters that use it (all, solo, realistic)
  const baseRank = fnExtractBaseRank(rawRecord);
  if (agg.rank_histogram !== undefined && baseRank !== null) {
    agg.rank_histogram[baseRank][modeKey] += 1;
  }

  // map distribution, so get map and then add 1 for it
  if (typeof rawRecord.map === 'string' && rawRecord.map.length > 0) {
    const mapName = rawRecord.map;

    // gotta initialise the map if its not been seen before
    if (agg.map_distribution[mapName] === undefined) {
      agg.map_distribution[mapName] = 0;
    }
    agg.map_distribution[mapName] += 1;
  }

  // input distribution, these are strings in the no hesi api, of 0 for wheel, 1 for controller and 2 for kb
  if (rawRecord.input !== null && rawRecord.input !== undefined) {
    const inputKey = String(rawRecord.input);
    if (agg.input_distribution[inputKey] === undefined) {
      agg.input_distribution[inputKey] = 0;
    }
    agg.input_distribution[inputKey] += 1;
  }

  // traffic type distribution, a literal "none" value is impossible in-game, so it's treated as bad/missing data and dropped rather than counted
  if (typeof rawRecord.traffic_type === 'string' && rawRecord.traffic_type.length > 0 && rawRecord.traffic_type.toLowerCase() !== 'none') {
    const trafficType = rawRecord.traffic_type;
    if (agg.traffic_distribution[trafficType] === undefined) {
      agg.traffic_distribution[trafficType] = 0;
    }
    agg.traffic_distribution[trafficType] += 1;
  }

  // run time is seconds, split into 30 second buckets since runs max out at 3 minutes this series
  const runTimeSeconds = Number(rawRecord.run_time);

  // ensures the time is valid
  if (Number.isFinite(runTimeSeconds) && runTimeSeconds > 0) {
    // rounds to the correct 30 second bucket
    const thirtySecondBucket = Math.floor(runTimeSeconds / RUN_TIME_BUCKET_SECONDS);

    // anything at or above the 3 minute cap lands in the very last bucket
    const bucketIndex = Math.min(RUN_TIME_BUCKET_COUNT - 1, thirtySecondBucket);
    agg.run_time_histogram[bucketIndex] += 1;
  }

  // car tally's
  if (typeof rawRecord.car_model === 'string' && rawRecord.car_model.length > 0) {
    const carModel = rawRecord.car_model;
    if (agg.cars_tally[carModel] === undefined) {
      agg.cars_tally[carModel] = 0;
    }
    agg.cars_tally[carModel] += 1;
  }

  // tyre distributions
  if (typeof rawRecord.tyre_compound === 'string' && rawRecord.tyre_compound.length > 0) {
    const tyreCompound = rawRecord.tyre_compound;
    if (agg.tyre_compound_distribution[tyreCompound] === undefined) {
      agg.tyre_compound_distribution[tyreCompound] = 0;
    }
    agg.tyre_compound_distribution[tyreCompound] += 1;
  }

  // camera type distributions
  if (typeof rawRecord.camera_type === 'string' && rawRecord.camera_type.length > 0) {
    const cameraType = rawRecord.camera_type;
    if (agg.camera_distribution[cameraType] === undefined) {
      agg.camera_distribution[cameraType] = 0;
    }
    agg.camera_distribution[cameraType] += 1;
  }

  // prox scatter points
  if (agg.prox_scatter !== undefined) {
    const proxTimeSeconds = Number(rawRecord.prox_time);
    const proxCombo = Number(rawRecord.prox_combo);

    if (Number.isFinite(proxTimeSeconds) && Number.isFinite(proxCombo) && agg.prox_scatter.length < PROX_SCATTER_MAX_POINTS) {
      agg.prox_scatter.push({ prox_time: proxTimeSeconds, prox_combo: proxCombo });
    }
  }
}

// fetches one page of the lb - and attempts again if it fails
async function fnFetchPageWithRetry(pageOffset) {
  let lastError;

  // you get 3 attempts from var at beginning
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    try {
      // url builder from var at beginning
      const url = LEADERBOARD_API_URL + '?offset=' + pageOffset + '&limit=' + API_PAGE_SIZE;

      // fetches the api
      const response = await fetch(url);

      // if it succeeds
      if (response.ok === false) {
        // 429 technically is like being rate limited, so we will retry
        const isTransient = response.status >= 500 || response.status === 429;

        if (isTransient === false) {
          // 400 errors, dont retry
          throw new Error('Upstream returned ' + response.status + ' (offset=' + pageOffset + ') - non-retryable');
        }

        // we will retry
        throw new Error('Upstream returned ' + response.status + ' (offset=' + pageOffset + ')');
      }

      return await response.json();

    } catch (err) {
      // catching the error that was returned
      lastError = err;

      // retrying this page
      const retriesRemaining = RETRY_ATTEMPTS - 1 - attempt;
      if (retriesRemaining > 0) {
        const backoffMs = RETRY_BACKOFF_MS[attempt];
        console.warn('[scrape] attempt ' + (attempt + 1) + ' failed at offset=' + pageOffset + ': ' + err.message + ' - retrying in ' + backoffMs + 'ms');

        await new Promise(function(resolveTimer) {
          setTimeout(resolveTimer, backoffMs);
        });
      }
    }
  }

  // if this occurs everything hit the fan and well it just didnt work
  throw lastError;
}

// entry point, what starts everything
async function fnRunScrape() {
  let startupMessage = '[scrape] starting - output=' + OUTPUT_PATH;
  if (TEST_MAX_PAGES !== null) {
    startupMessage = startupMessage + ' (capped at ' + TEST_MAX_PAGES + ' pages)';
  }
  console.log(startupMessage);

  // records current time so we calculate how long it took
  const scrapeStartMs = Date.now();

  // create the buckets for each filter
  const aggregationsByFilter = {};
  for (const filterName of FILTER_NAMES) {
    aggregationsByFilter[filterName] = fnCreateEmptyAggregations(filterName);
  }

  // rank breakdown is global (not per-filter) so it gets its own accumulator
  const rankTotals = fnCreateEmptyRankTotals();

  // tracks which leaderboard positions have been folded into the rank breakdown so
  // duplicate/junk rows that reuse a position are only counted once (see fnBumpRankTotals)
  const seenRankPositions = new Set();

  // raw scores collected during the scrape - used after the loop to compute score_histogram for the solo filter
  const soloScores = [];

  // records to skip in each request (increases by 100 each page)
  let pageOffset = 0;

  // how many API requests we have made so far
  let pagesFetched = 0;

  // how many individual run records we have processed
  let totalRecordsScraped = 0;

  // the API tells us the total number of records; null until we get it
  let upstreamTotal = null;

  // the main loop that will go on and on and on
  while (true) {
    // stops for that testing max pages
    if (TEST_MAX_PAGES !== null && pagesFetched >= TEST_MAX_PAGES) {
      console.log('[scrape] hit TEST_MAX_PAGES=' + TEST_MAX_PAGES + ' - stopping early');
      break;
    }

    // fetch the next page of records from the api
    const responseBody = await fnFetchPageWithRetry(pageOffset);

    let records;

    // if its empty just fallback on an empty array
    if (responseBody.data !== undefined && responseBody.data !== null) {
      records = responseBody.data;
    } else {
      records = [];
    }

    // very last page handling to read the total record count from the api metadata
    if (upstreamTotal === null) {
      let metadataTotal;
      if (responseBody.metadata !== undefined && responseBody.metadata !== null) {
        metadataTotal = responseBody.metadata.total_filtered_count;
      } else {
        metadataTotal = undefined;
      }

      if (metadataTotal !== undefined && metadataTotal !== null) {
        upstreamTotal = metadataTotal;
      }
    }

    // time to process each record
    for (const rawRecord of records) {
      totalRecordsScraped += 1;

      // filter into bucket
      const matchingFilters = fnGetMatchingFilters(rawRecord);

      // add record to each data point
      for (const filterName of matchingFilters) {
        fnBumpAggregations(aggregationsByFilter[filterName], rawRecord);
      }

      // fold the record into the global rank breakdown (deduped by position)
      fnBumpRankTotals(rankTotals, rawRecord, seenRankPositions);

      // collect solo scores for the post-loop histogram - only valid positive numbers
      if (!(Number(rawRecord.prox_combo) > 1)) {
        const score = Number(rawRecord.score);
        if (Number.isFinite(score) && score > 0) {
          soloScores.push(score);
        }
      }
    }

    pagesFetched += 1;

    // progress update every 10 pages
    if (pagesFetched % PROGRESS_EVERY_N_PAGES === 0) {
      let progressPct;
      if (upstreamTotal !== null && upstreamTotal > 0) {
        progressPct = ((totalRecordsScraped / upstreamTotal) * 100).toFixed(1);
      } else {
        progressPct = '?';
      }

      let totalLabel;
      if (upstreamTotal !== null) {
        totalLabel = String(upstreamTotal);
      } else {
        totalLabel = '?';
      }

      console.log('[scrape] offset=' + (pageOffset + records.length) + ' / ' + totalLabel + ' (' + progressPct + '%)');
    }

    // if something was blank just stop instead of infinitely trying
    if (records.length === 0) {
      console.warn('[scrape] empty page at offset=' + pageOffset + ' - stopping (expected total=' + upstreamTotal + ')');
      break;
    }

    // we are done
    if (upstreamTotal !== null && pageOffset + records.length >= upstreamTotal) {
      break;
    }

    // advance offset to continue going
    pageOffset += API_PAGE_SIZE;
  }

  // build score distribution histogram for solo runs
  if (soloScores.length > 0) {
    const SCORE_BUCKET_COUNT = 20;

    // top 1% of scores are clamped into the final bucket
    const OUTLIER_PERCENTILE = 0.99;

    // copy to avoid mutating the collection used elsewhere
    const sortedScores = soloScores.slice().sort(function(a, b) { return a - b; });
    const maxScore = sortedScores[sortedScores.length - 1];
    const percentileIdx = Math.floor(OUTLIER_PERCENTILE * (sortedScores.length - 1));

    // bucket width is derived from this, not from the max
    const cutoffScore = sortedScores[percentileIdx];

    // guard against zero just in case cutoff is unusually low
    const bucketWidth = Math.max(1, Math.ceil(cutoffScore / SCORE_BUCKET_COUNT));

    const counts = new Array(SCORE_BUCKET_COUNT).fill(0);
    for (const score of soloScores) {
      const bucketIdx = Math.min(SCORE_BUCKET_COUNT - 1, Math.floor(score / bucketWidth));
      counts[bucketIdx] += 1;
    }

    aggregationsByFilter.solo.score_histogram = {
      bucket_width: bucketWidth,
      counts: counts,

      // 99th-percentile score; bucket 19 is ">= cutoff_score" (catches everything above too)
      cutoff_score: cutoffScore,

      // true max, recorded so the UI can call out the overflow context
      max_score: maxScore
    };
    console.log('[scrape] score histogram built - max=' + maxScore + ' p99=' + cutoffScore + ' bucket_width=' + bucketWidth);
  }

  // time to build the output json
  const output = {
    // generated at iso timestamp
    generated_at: new Date().toISOString(),
    total_records_scraped: totalRecordsScraped,
    upstream_total: upstreamTotal,
    filters: aggregationsByFilter
  };

  // make sure the output folder exists before writing
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  // write the json
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  // build the rank breakdown output in canonical best-to-worst order
  const rankThresholds = [];
  for (const entry of RANK_TIER_ORDER) {
    const tierName = fnBuildTierName(entry.rank, entry.tier);
    const bucket = rankTotals[tierName];
    rankThresholds.push({
      rank: bucket.rank,
      tier: bucket.tier,
      tier_name: tierName,
      min_score: bucket.min_score,
      lowest_position: bucket.lowest_position,
      player_count: bucket.player_count
    });
  }

  const ranksOutput = {
    generated_at: new Date().toISOString(),
    total_players: upstreamTotal,
    thresholds: rankThresholds
  };

  // write the rank breakdown alongside stats.json
  writeFileSync(RANKS_OUTPUT_PATH, JSON.stringify(ranksOutput, null, 2));
  console.log('[scrape] wrote ' + RANKS_OUTPUT_PATH);

  // total time taken
  const elapsedMs = Date.now() - scrapeStartMs;
  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  console.log('[scrape] done - ' + totalRecordsScraped + ' records, ' + pagesFetched + ' pages, ' + elapsedSec + 's');
  console.log('[scrape] wrote ' + OUTPUT_PATH);
}

fnRunScrape().catch(function(err) {
  console.error('[scrape] fatal:', err);
  process.exit(1);
});
