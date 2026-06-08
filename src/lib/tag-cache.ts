import type { TagGroup } from '@/types';
import { fetchAllEmailAccountsWithTags } from './smartlead';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedTags: TagGroup[] | null = null;
let cacheTimestamp = 0;
// Single in-flight promise prevents thundering herd on cold start
let refreshPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  try {
    const tags = await fetchAllEmailAccountsWithTags();
    cachedTags = tags;
    cacheTimestamp = Date.now();
  } finally {
    refreshPromise = null;
  }
}

/**
 * Returns cached tags, refreshing in the background when stale.
 * On cold start, waits for the first fetch to complete.
 */
export async function getTagsWithCache(): Promise<TagGroup[]> {
  if (!cachedTags) {
    if (!refreshPromise) refreshPromise = doRefresh();
    await refreshPromise;
    return cachedTags!;
  }

  const stale = Date.now() - cacheTimestamp > CACHE_TTL_MS;
  if (stale && !refreshPromise) {
    // Return stale data immediately, refresh in background
    refreshPromise = doRefresh();
  }

  return cachedTags;
}

export function invalidateTagCache(): void {
  cachedTags = null;
  cacheTimestamp = 0;
}

export function getCacheStatus(): { cached: boolean; ageSeconds: number; accounts: number; tags: number } {
  return {
    cached: cachedTags !== null,
    ageSeconds: cachedTags ? Math.floor((Date.now() - cacheTimestamp) / 1000) : -1,
    accounts: cachedTags?.reduce((sum, t) => sum + t.count, 0) ?? 0,
    tags: cachedTags?.length ?? 0,
  };
}
