import { writeFileSync, mkdirSync } from 'node:fs';           // adds ability to save text to a file, and create a folder
import { dirname, resolve } from 'node:path';                 // retrns file paths and builds absolute paths from parts
import process from 'node:process';                           

const LEADERBOARD_API_URL = 'https://leaderboard-06nkmjf5r0.nohesi.gg/scores';  // no hesi url we are scraping

const API_PAGE_SIZE = 100;                                    // how many records per page
const PROGRESS_EVERY_N_PAGES = 10;                            // prints a progress line in console after this many pagers
const RETRY_ATTEMPTS = 3;                                     // if a request fails, we retry it 3 times
const RETRY_BACKOFF_MS = [1000, 2000, 4000];                  // how long we wait before each retry to give the server a break

// set to something when testing so not everything gets scraped
const TEST_MAX_PAGES = null;                                  

// saves the json file to where the process was run, which is what process.cwd does
const OUTPUT_PATH = resolve(process.cwd(), 'static', 'stats.json'); 

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


// the amount of buckets in the histogram. 1 bucket is for up to 1 minute etc
const RUN_TIME_BUCKET_COUNT = 15;                             

// creates empty buckets at the start of each scrape for each fo the 4 filter buckets
function fnCreateEmptyAggregations(filterName) {
  const aggregations = {
    total_runs: 0,
    mode_split: {
      solo: 0,
      crew: 0
    },

    map_distribution:           {},
    input_distribution:         {},
    traffic_distribution:       {},
    cars_tally:                 {},
    tyre_compound_distribution: {},
    camera_distribution:        {},

    run_time_histogram: new Array(RUN_TIME_BUCKET_COUNT).fill(0)
  };

  if (filterName !== 'crew') {                                // rank histogram is only used by the all, solo, and realistic filter views
    aggregations.rank_histogram = {};
    for (const rankName of KNOWN_BASE_RANKS) {
      aggregations.rank_histogram[rankName] = { crew: 0, solo: 0 };
    }
  }

  if (filterName === 'crew') {                                // team size by rank is only meaningful for crew runs
    aggregations.team_size_by_rank = {};
    for (const rankName of KNOWN_BASE_RANKS) {
      aggregations.team_size_by_rank[rankName] = { '2': 0, '3': 0, '4': 0, '5': 0 };
    }
  }

  return aggregations;
}


function fnGetMatchingFilters(rawRecord) {                    // filters each record into the buckets they need to go into - they can go into multiple
  // Every record always belongs in the 'all' bucket
  const matches = ['all'];                                    // every record will go into the all bucket

  if (rawRecord.mode === 'team') {                            // any record with the mode equal to team is a crew run
    matches.push('crew');
  } else if (rawRecord.mode === 'solo') {                     // otherwise it will be a solo run
    matches.push('solo');

    if (typeof rawRecord.car_model === 'string') {            // as long as car_model is a string then we check to see if it has the word realistic inside it, and if so, add it to the realistic bucket. This is only for solo runs, as crew runs can have multiple different cars
      const carModelLowercase = rawRecord.car_model.toLowerCase();
      if (carModelLowercase.includes('realistic')) {
        matches.push('realistic');
      }
    }
  }

  return matches;
}


function fnExtractBaseRank(rawRecord) {                        // stripping numbers/ the tier of the rank to get the base ranks

  let tierName;

  if (rawRecord.ranking !== undefined && rawRecord.ranking !== null) {  // tier name can be found inside ranking in the returned json from no hesi - so this is the safety check
    tierName = rawRecord.ranking.tier_name;
  } else {
    tierName = undefined;
  }

  if (typeof tierName !== 'string' || tierName.length === 0) {  // if its null or not a string we just return null. never should happen
    return null;
  }

  const parts = tierName.split(/\s+/);                          // split the word by white space, and then we take the first part of it as the base rank
  const baseRank = parts[0];

  return baseRank;
}

function fnBumpAggregations(agg, rawRecord) {                   // the function that creates the stats for each record
  agg.total_runs += 1;                                          // add a count to the total runs on the lb

  // split our record into crew or solo
  let modeKey;  
  if (rawRecord.mode === 'team') {
    modeKey = 'crew';
  } else if (rawRecord.mode === 'solo') {
    modeKey = 'solo';
  } else {
    modeKey = null;                                             // safety check, even though it should never happen
  }

  if (modeKey !== null) {                                       // tally the mode
    agg.mode_split[modeKey] += 1;
  }

  // add record to the rank histogram - only present on filters that use it (all, solo, realistic)
  const baseRank = fnExtractBaseRank(rawRecord);
  if (agg.rank_histogram !== undefined && baseRank !== null && modeKey !== null) {
    agg.rank_histogram[baseRank][modeKey] += 1;
  }

  // map distribution, so get map and then add 1 for it
  if (typeof rawRecord.map === 'string' && rawRecord.map.length > 0) {
    const mapName = rawRecord.map;
    if (agg.map_distribution[mapName] === undefined) {           // gotta initialise the map if its not been seen before
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

  // traffic type distribution
  if (typeof rawRecord.traffic_type === 'string' && rawRecord.traffic_type.length > 0) {
    const trafficType = rawRecord.traffic_type;
    if (agg.traffic_distribution[trafficType] === undefined) {
      agg.traffic_distribution[trafficType] = 0;
    }
    agg.traffic_distribution[trafficType] += 1;
  }


  // run time distribution
  const runTimeSeconds = Number(rawRecord.run_time);                        // run time is seconds so we convert to minutes

  if (Number.isFinite(runTimeSeconds) && runTimeSeconds > 0) {              // ensures the time is valid
    const minutesBucket = Math.floor(runTimeSeconds / 60);                  // rounds to the correct bucket
    const bucketIndex = Math.min(RUN_TIME_BUCKET_COUNT - 1, minutesBucket); // just put everything above 14 minutes in the very last bucket
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


  // team size by rank — only present on the crew filter bucket
  if (agg.team_size_by_rank !== undefined && modeKey === 'crew' && Array.isArray(rawRecord.team) && baseRank !== null) {
    const teamSize = rawRecord.team.length;
    const rankBucket = agg.team_size_by_rank[baseRank];
    if (rankBucket !== undefined && teamSize >= 2 && teamSize <= 5) {     // bucket is pre-seeded for known ranks; sizes outside 2-5 fall outside the chart's x-axis and are dropped
      const teamSizeKey = String(teamSize);
      rankBucket[teamSizeKey] += 1;
    }
  }
}

async function fnFetchPageWithRetry(pageOffset) {                       // fetches one page of the lb - and attempts again if it fails
  let lastError;

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {       // you get 3 attempts from var at beginning
    try {
      const url = LEADERBOARD_API_URL + '?offset=' + pageOffset + '&limit=' + API_PAGE_SIZE;  // url builder from var at beginning

      const response = await fetch(url);                                // fetches the api

      if (response.ok === false) {                                      // if it succeeds
        const isTransient = response.status >= 500 || response.status === 429; // 429 technically is like being rate limited, so we will retry

        if (isTransient === false) {
          throw new Error('Upstream returned ' + response.status + ' (offset=' + pageOffset + ') - non-retryable'); // 400 errors, dont retry
        }

        throw new Error('Upstream returned ' + response.status + ' (offset=' + pageOffset + ')'); // we will retry 
      }

      return await response.json();

    } catch (err) {
      lastError = err;                                                  // catching the error that was returned

      const retriesRemaining = RETRY_ATTEMPTS - 1 - attempt;            // retrying this page
      if (retriesRemaining > 0) {
        const backoffMs = RETRY_BACKOFF_MS[attempt];
        console.warn('[scrape] attempt ' + (attempt + 1) + ' failed at offset=' + pageOffset + ': ' + err.message + ' - retrying in ' + backoffMs + 'ms');

        await new Promise(function(resolveTimer) {
          setTimeout(resolveTimer, backoffMs);
        });
      }
    }
  }

  throw lastError;                                                      // if this occurs shit hit the fan and well it just didnt work
}


async function fnRunScrape() {                                        // entry point, what starts everything
  let startupMessage = '[scrape] starting - output=' + OUTPUT_PATH;
  if (TEST_MAX_PAGES !== null) {
    startupMessage = startupMessage + ' (capped at ' + TEST_MAX_PAGES + ' pages)';
  }
  console.log(startupMessage);

  const scrapeStartMs = Date.now();                                   // records current time so we calculate how long it took


  // create the buckets for each filter
  const aggregationsByFilter = {};
  for (const filterName of FILTER_NAMES) {
    aggregationsByFilter[filterName] = fnCreateEmptyAggregations(filterName);
  }

  const soloScores = [];  // raw scores collected during the scrape — used after the loop to compute score_histogram for the solo filter


  let pageOffset = 0;           // records to skip in each request (increases by 100 each page)
  let pagesFetched = 0;         // how many API requests we have made so far
  let totalRecordsScraped = 0;  // how many individual run records we have processed
  let upstreamTotal = null;     // the API tells us the total number of records; null until we get it


  // the main loop that will go on and on and on 
  while (true) {
    if (TEST_MAX_PAGES !== null && pagesFetched >= TEST_MAX_PAGES) {  // stops for that testing max pages
      console.log('[scrape] hit TEST_MAX_PAGES=' + TEST_MAX_PAGES + ' - stopping early');
      break;
    }

    // fetch the next page of records from the api
    const responseBody = await fnFetchPageWithRetry(pageOffset);

    let records;
    if (responseBody.data !== undefined && responseBody.data !== null) { // if its empty just fallback on an empty array
      records = responseBody.data;
    } else {
      records = [];
    }


    if (upstreamTotal === null) {                                       // very last page handling to read the total record count from the api metadata
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

      // collect solo scores for the post-loop histogram — only valid positive numbers
      if (rawRecord.mode === 'solo') {
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

    if (upstreamTotal !== null && pageOffset + records.length >= upstreamTotal) {
      break;                                                            // We are done
    }

    pageOffset += API_PAGE_SIZE;                                        // advance offset to continue going
  }


  // build score distribution histogram for solo runs
  if (soloScores.length > 0) {
    const SCORE_BUCKET_COUNT = 20;
    const OUTLIER_PERCENTILE = 0.99;                                                  // top 1% of scores are clamped into the final bucket

    const sortedScores = soloScores.slice().sort(function(a, b) { return a - b; });   // copy to avoid mutating the collection used elsewhere
    const maxScore = sortedScores[sortedScores.length - 1];
    const percentileIdx = Math.floor(OUTLIER_PERCENTILE * (sortedScores.length - 1));
    const cutoffScore = sortedScores[percentileIdx];                                  // bucket width is derived from this, not from the max

    const bucketWidth = Math.max(1, Math.ceil(cutoffScore / SCORE_BUCKET_COUNT));     // guard against zero just in case cutoff is unusually low

    const counts = new Array(SCORE_BUCKET_COUNT).fill(0);
    for (const score of soloScores) {
      const bucketIdx = Math.min(SCORE_BUCKET_COUNT - 1, Math.floor(score / bucketWidth));
      counts[bucketIdx] += 1;
    }

    aggregationsByFilter.solo.score_histogram = {
      bucket_width: bucketWidth,
      counts: counts,
      cutoff_score: cutoffScore,                                                   // 99th-percentile score; bucket 19 is "≥ cutoff_score" (catches everything above too)
      max_score: maxScore                                                          // true max, recorded so the UI can call out the overflow context
    };
    console.log('[scrape] score histogram built - max=' + maxScore + ' p99=' + cutoffScore + ' bucket_width=' + bucketWidth);
  }


  // time to build the output json
  const output = {
    generated_at: new Date().toISOString(),                             // generated at iso timestamp
    total_records_scraped: totalRecordsScraped,
    upstream_total: upstreamTotal,
    filters: aggregationsByFilter
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });                 // make sure the output folder exists lol

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));          // write the json

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
