const IMMUTABLE_PATH_PREFIXES = [
  '/vid/',           // background loops and other static videos in /static/vid
  '/faqs-images/',   // FAQ attachment mirrors downloaded from Discord CDN
  '/icons/',         // app icons referenced by the manifest
  '/img/',           // misc static imagery
];

const RATE_LIMIT_MAX = 60;                  // max API requests allowed per IP within the window
const RATE_LIMIT_WINDOW_MS = 60 * 1000;     // window length - 1 minute
const rateLimitByIp = new Map();            // clientIp -> { count, windowStart }
let lastSweep = Date.now();                 // last time we purged expired IP entries

function fnSweepExpired(now) {              // drop stale entries so the map cannot grow unbounded on a long-lived instance
  if (now - lastSweep < RATE_LIMIT_WINDOW_MS) return;
  for (const [ip, entry] of rateLimitByIp) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) rateLimitByIp.delete(ip);
  }
  lastSweep = now;
}

function fnIsRateLimited(clientIp) {        // fixed-window counter: returns true once an IP exceeds RATE_LIMIT_MAX in the current window
  const now = Date.now();
  fnSweepExpired(now);

  let entry = rateLimitByIp.get(clientIp);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };  // start a fresh window for this IP
    rateLimitByIp.set(clientIp, entry);
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export async function handle({ event, resolve }) { // called by SvelteKit on every incoming request - name is required by the framework
  const requestPath = event.url.pathname;

  if (requestPath.startsWith('/api/') && fnIsRateLimited(event.getClientAddress())) { // throttle only the API routes; static assets and pages stay uncapped
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(RATE_LIMIT_WINDOW_MS / 1000) }
    });
  }

  const serverResponse = await resolve(event);

  if (IMMUTABLE_PATH_PREFIXES.some((prefix) => requestPath.startsWith(prefix))) {
    serverResponse.headers.set('Cache-Control', 'public, max-age=2592000, immutable');
  }

  return serverResponse;
}
