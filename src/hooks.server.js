const IMMUTABLE_PATH_PREFIXES = [
  '/vid/',
  '/faqs-images/',
  '/icons/',
  '/img/',
];

// max API requests allowed per IP within the window
const RATE_LIMIT_MAX = 60;

// window length - 1 minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// clientIp -> { count, windowStart }
const rateLimitByIp = new Map();

// last time we purged expired IP entries
let lastSweep = Date.now();

// drop stale entries so the map cannot grow unbounded on a long-lived instance
function fnSweepExpired(now) {
  if (now - lastSweep < RATE_LIMIT_WINDOW_MS) return;

  for (const [ip, entry] of rateLimitByIp) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) rateLimitByIp.delete(ip);
  }

  lastSweep = now;
}

// fixed-window counter: returns true once an IP exceeds RATE_LIMIT_MAX in the current window
function fnIsRateLimited(clientIp) {
  const now = Date.now();
  fnSweepExpired(now);

  let entry = rateLimitByIp.get(clientIp);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // start a fresh window for this IP
    entry = { count: 0, windowStart: now };
    rateLimitByIp.set(clientIp, entry);
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// called by SvelteKit on every incoming request - name is required by the framework
export async function handle({ event, resolve }) {
  const requestPath = event.url.pathname;

  // throttle only the API routes; static assets and pages stay uncapped
  if (requestPath.startsWith('/api/') && fnIsRateLimited(event.getClientAddress())) {
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
