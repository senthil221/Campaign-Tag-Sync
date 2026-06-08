import type { TagGroup } from '@/types';
import { fetchAllEmailAccountsWithTags } from './smartlead';

/**
 * Simple in-memory cache for the tag/account dataset with stale-while-
 * revalidate: the first request fetches live, subsequent requests return
 * instantly, and once the data is older than the TTL it refreshes in the
 * background while still serving the cached copy.
 */

const STALE_MS = 10 * 60 * 1000; // 10 minutes

let cached: TagGroup[] | null = null;
let updatedAt = 0;
let refresh: Promise<void> | null = null;

function countAccounts(tags: TagGroup[]): number {
  return tags.reduce((sum, t) => sum + t.count, 0);
}

async function doRefresh(): Promise<void> {
  try {
    cached = await fetchAllEmailAccountsWithTags();
    updatedAt = Date.now();
  } finally {
    refresh = null;
  }
}

/** Read the dataset for serving requests. */
export async function getTags(): Promise<TagGroup[]> {
  if (!cached) {
    if (!refresh) refresh = doRefresh();
    await refresh;
    return cached!;
  }
  if (Date.now() - updatedAt > STALE_MS && !refresh) {
    refresh = doRefresh(); // refresh in background, serve stale now
  }
  return cached;
}

/** Force a fresh fetch and replace the cache (manual refresh). */
export async function refreshTags(): Promise<{ updatedAt: number; accounts: number; tags: number }> {
  cached = await fetchAllEmailAccountsWithTags();
  updatedAt = Date.now();
  return { updatedAt, accounts: countAccounts(cached), tags: cached.length };
}

export function invalidateTags(): void {
  cached = null;
  updatedAt = 0;
}

export function getStoreStatus(): { cached: boolean; ageSeconds: number; accounts: number; tags: number } {
  return {
    cached: cached !== null,
    ageSeconds: cached ? Math.floor((Date.now() - updatedAt) / 1000) : -1,
    accounts: cached ? countAccounts(cached) : 0,
    tags: cached?.length ?? 0,
  };
}
