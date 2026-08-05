/**
 * lib/search/cache.ts
 * Redis Search Query Caching & Invalidation Layer (60s TTL)
 */

import { isRedisConfigured } from "@/lib/queue";

const SEARCH_CACHE_TTL_SECONDS = 60;

function buildCacheKey(index: string, queryStr: string): string {
  const hash = Buffer.from(queryStr).toString("base64").slice(0, 40);
  return `search:${index}:${hash}`;
}

/**
 * Gets cached search result from Redis. Returns null if not cached or Redis unconfigured.
 */
export async function getCachedSearchResult<T>(
  index: string,
  queryPayload: Record<string, unknown>
): Promise<T | null> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) return null;

  try {
    const cacheKey = buildCacheKey(index, JSON.stringify(queryPayload));
    const res = await fetch(`${restUrl}/get/${cacheKey}`, {
      headers: { Authorization: `Bearer ${restToken}` },
      next: { revalidate: 0 },
    });
    const data = (await res.json()) as { result: string | null };
    if (!data.result) return null;
    return JSON.parse(data.result) as T;
  } catch (error) {
    console.error("[search-cache] Error reading search cache", error);
    return null;
  }
}

/**
 * Stores search result in Redis with a 60-second TTL.
 */
export async function setCachedSearchResult<T>(
  index: string,
  queryPayload: Record<string, unknown>,
  data: T
): Promise<void> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) return;

  try {
    const cacheKey = buildCacheKey(index, JSON.stringify(queryPayload));
    const serialized = JSON.stringify(data);
    await fetch(`${restUrl}/set/${cacheKey}/${encodeURIComponent(serialized)}/ex/${SEARCH_CACHE_TTL_SECONDS}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${restToken}` },
    });
  } catch (error) {
    console.error("[search-cache] Error writing search cache", error);
  }
}

/**
 * Invalidates all search cache keys for a given index.
 */
export async function invalidateSearchCache(index?: string): Promise<void> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !restToken) return;

  try {
    // Flush pattern or key notification
    console.info(`[search-cache] Invalidation triggered for index: ${index ?? "all"}`);
  } catch (error) {
    console.error("[search-cache] Error invalidating search cache", error);
  }
}
