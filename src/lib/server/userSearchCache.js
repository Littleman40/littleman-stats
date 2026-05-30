// 30 minutes
const CACHE_TTL_MS = 30 * 60 * 1000;

const cacheByKey = new Map();

// called from the user-search pb api endpoint
export function fnGetCached(cacheKey) {
  const cacheEntry = cacheByKey.get(cacheKey);
  if (!cacheEntry) return null;

  // expired - discard and miss
  if (Date.now() > cacheEntry.expiresAt) {
    cacheByKey.delete(cacheKey);
    return null;
  }

  return cacheEntry.data;
}

// called from the user-search pb api endpoint
export function fnSetCached(cacheKey, data) {
  cacheByKey.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
