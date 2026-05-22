const CACHE_TTL_MS = 30 * 60 * 1000;                                              // 30 minutes

const cacheByKey = new Map();

export function fnGetCached(cacheKey) {                                           // called from the user-search api endpoints (pb, totals, history)
  const cacheEntry = cacheByKey.get(cacheKey);
  if (!cacheEntry) return null;
  if (Date.now() > cacheEntry.expiresAt) {                                        // expired - discard and miss
    cacheByKey.delete(cacheKey);
    return null;
  }
  return cacheEntry.data;
}

export function fnSetCached(cacheKey, data) {                                     // called from the user-search api endpoints (pb, totals, history)
  cacheByKey.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
