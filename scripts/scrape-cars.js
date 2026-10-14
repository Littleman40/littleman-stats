// scrapes which cars are on which no hesi server and saves it to static/cars.json
// the server list itself (players, names, regions) is NOT stored here, the website reads that live from the fleet api
// only the car lists need scraping because /info is plain http with no cors, so a browser can never call it
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

import { fnIsTrafficCar } from '../src/lib/utils/cars.js';

const API_BASE = 'https://api.nohesi.gg';

// identifies us to no hesi so they can see who is calling and why
const USER_AGENT = 'littleman-stats car scraper (unofficial community tool)';

// how many /info requests run at once - kept low to be polite to the servers
const INFO_CONCURRENCY = 8;

const REQUEST_TIMEOUT_MS = 10000;

function fnBuildCarsPath() {
  return resolve(process.cwd(), 'static', 'cars.json');
}

async function fnGetJson(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(url + ' -> ' + response.status);
  return response.json();
}

// runs fnWorker over every item but only N at a time
async function fnMapWithLimit(items, limit, fnWorker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await fnWorker(item);
    }
  });
  await Promise.all(workers);
}

// every official shard, found by asking the fleet api which experiences exist (so new ones are picked up automatically)
async function fnFetchFleetShards() {
  const { experiences } = await fnGetJson(API_BASE + '/fleet/experiences');
  const shards = [];

  await Promise.all(experiences.map(async (experience) => {
    const data = await fnGetJson(API_BASE + '/fleet/experiences/' + encodeURIComponent(experience.id) + '/shards');
    for (const shard of data.shards) {
      shards.push({ endpoint: shard.endpoint, shardId: shard.id, experienceId: experience.id });
    }
  }));

  return shards;
}

// custom (community) servers only exist in the legacy catalog, which lists their cars directly
async function fnFetchCustomServers() {
  const { data } = await fnGetJson(API_BASE + '/servers-catalog');
  return (data.customServers ?? []).map((server) => ({
    endpoint: server.ip_address,
    cars: (server.carSlots ?? []).map((slot) => slot.model)
  }));
}

async function fnRun() {
  const shards = await fnFetchFleetShards();
  console.log('Found ' + shards.length + ' official shards');

  // endpoint -> cars on that server
  const servers = {};
  let failedCount = 0;

  await fnMapWithLimit(shards, INFO_CONCURRENCY, async (shard) => {
    try {
      const info = await fnGetJson('http://' + shard.endpoint + '/info');
      servers[shard.endpoint] = {
        shardId: shard.shardId,
        experienceId: shard.experienceId,
        cars: info.cars.filter((model) => !fnIsTrafficCar(model)).sort()
      };
    } catch (error) {
      failedCount++;
      console.warn('Skipped ' + shard.endpoint + ': ' + error.message);
    }
  });

  // abort without writing so the last good cars.json stays in place if the fleet api changed or everything failed
  if (Object.keys(servers).length === 0) throw new Error('No servers could be scanned, not overwriting cars.json');

  // shards scale up and down between scrapes, so a brand new shard has no entry yet. every shard in an experience has the same
  // cars, so the website falls back to this per-experience list for those
  const experienceCars = {};
  for (const server of Object.values(servers)) {
    const carSet = experienceCars[server.experienceId] ?? new Set();
    server.cars.forEach((model) => carSet.add(model));
    experienceCars[server.experienceId] = carSet;
  }
  for (const experienceId of Object.keys(experienceCars)) {
    experienceCars[experienceId] = [...experienceCars[experienceId]].sort();
  }

  // custom servers are best-effort, the site reads their live car list itself so only the car names are used from here
  let customServers = [];
  try {
    customServers = await fnFetchCustomServers();
  } catch (error) {
    console.warn('Custom servers skipped: ' + error.message);
  }

  // every car seen anywhere, with how many servers have it
  const carCounts = new Map();
  const fnCount = (model) => carCounts.set(model, (carCounts.get(model) ?? 0) + 1);
  Object.values(servers).forEach((server) => server.cars.forEach(fnCount));
  customServers.forEach((server) => server.cars.filter((model) => !fnIsTrafficCar(model)).forEach(fnCount));

  const cars = [...carCounts]
    .map(([model, serverCount]) => ({ model, servers: serverCount }))
    .sort((a, b) => a.model.localeCompare(b.model));

  // updatedAt is the only thing that changes when nothing else has, so the workflow still sees a diff - fine for a 6 hourly job
  const output = { updatedAt: new Date().toISOString(), cars, servers, experienceCars };
  writeFileSync(fnBuildCarsPath(), JSON.stringify(output));

  console.log('Saved ' + cars.length + ' cars across ' + Object.keys(servers).length + ' servers (' + failedCount + ' failed)');
}

fnRun().catch((error) => {
  console.error(error);
  process.exit(1);
});
