// 30 minutes
const CACHE_TTL_MS = 30 * 60 * 1000;

const cacheByKey = new Map();



// retrieve cached data using the key - called from the user-search pb api endpoint
export function fnGetCached(cacheKey) {

  // looks up cache entry for that key
  const cacheEntry = cacheByKey.get(cacheKey);

  // if nothing exists return null
  if (!cacheEntry) return null;

  // expired - discard and miss
  if (Date.now() > cacheEntry.expiresAt) {
    cacheByKey.delete(cacheKey);
    return null;
  }

  // return the actual data
  return cacheEntry.data;
}



// stores data in cache with expiry time - called from the user-search pb api endpoint
export function fnSetCached(cacheKey, data) {
  cacheByKey.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
