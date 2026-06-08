import { gzipSync, gunzipSync } from 'zlib';
import { Redis } from '@upstash/redis';
import type { TagGroup } from '@/types';
import { fetchAllEmailAccountsWithTags } from './smartlead';

/**
 * Shared persistent store for the heavy tag/account dataset.
 *
 * On Vercel, serverless containers are ephemeral and not shared, so a plain
 * in-memory cache can't reliably serve 20k accounts without re-fetching (and
 * timing out). This module stores the grouped dataset in Upstash Redis,
 * refreshed in the background by a Vercel Cron, so user requests read it in
 * milliseconds. When Redis is not configured (e.g. local dev), it transparently
 * falls back to an in-memory stale-while-revalidate cache.
 */

const KEY = 'sender-sync:tags:v1';
const META_KEY = 'sender-sync:tags:v1:meta';
const STALE_MS = 15 * 60 * 1000; // in-memory fallback TTL

interface TagMeta {
  updatedAt: number;
  accounts: number;
  tags: number;
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export const isRedisConfigured = redis !== null;

// ---- compression ----------------------------------------------------------
// 20k accounts is ~1.2MB of JSON but compresses ~10x; we store it gzipped and
// base64-wrapped in an object so Upstash never tries to JSON-parse the blob.
function encode(tags: TagGroup[]): { gz: string } {
  return { gz: gzipSync(Buffer.from(JSON.stringify(tags))).toString('base64') };
}
function decode(wrapped: { gz: string }): TagGroup[] {
  return JSON.parse(gunzipSync(Buffer.from(wrapped.gz, 'base64')).toString('utf8'));
}

function countAccounts(tags: TagGroup[]): number {
  return tags.reduce((sum, t) => sum + t.count, 0);
}

// ---- in-memory fallback (local dev / no Redis) ----------------------------
let memTags: TagGroup[] | null = null;
let memUpdatedAt = 0;
let memRefresh: Promise<void> | null = null;

async function memDoRefresh(): Promise<void> {
  try {
    memTags = await fetchAllEmailAccountsWithTags();
    memUpdatedAt = Date.now();
  } finally {
    memRefresh = null;
  }
}

async function getTagsInMemory(): Promise<TagGroup[]> {
  if (!memTags) {
    if (!memRefresh) memRefresh = memDoRefresh();
    await memRefresh;
    return memTags!;
  }
  if (Date.now() - memUpdatedAt > STALE_MS && !memRefresh) {
    memRefresh = memDoRefresh(); // refresh in background, serve stale now
  }
  return memTags;
}

// ---- public API -----------------------------------------------------------

/**
 * Fetch fresh data from Smartlead and persist it. Called by the cron job and
 * by the manual-refresh endpoint.
 */
export async function refreshTags(): Promise<TagMeta> {
  const tags = await fetchAllEmailAccountsWithTags();
  const meta: TagMeta = { updatedAt: Date.now(), accounts: countAccounts(tags), tags: tags.length };

  if (redis) {
    await redis.set(KEY, encode(tags));
    await redis.set(META_KEY, meta);
  } else {
    memTags = tags;
    memUpdatedAt = meta.updatedAt;
  }
  return meta;
}

/**
 * Read the dataset for serving user requests. Reads from Redis instantly when
 * available; on a cold store (cron hasn't run yet) it does a one-time live
 * fetch and populates Redis so the next request is fast.
 */
export async function getTags(): Promise<TagGroup[]> {
  if (!redis) return getTagsInMemory();

  const stored = await redis.get<{ gz: string }>(KEY);
  if (stored?.gz) return decode(stored);

  // Cold store: populate now so subsequent requests are instant.
  const tags = await fetchAllEmailAccountsWithTags();
  const meta: TagMeta = { updatedAt: Date.now(), accounts: countAccounts(tags), tags: tags.length };
  await redis.set(KEY, encode(tags)).catch(() => {});
  await redis.set(META_KEY, meta).catch(() => {});
  return tags;
}

export async function invalidateTags(): Promise<void> {
  if (redis) {
    await redis.del(KEY);
    await redis.del(META_KEY);
  } else {
    memTags = null;
    memUpdatedAt = 0;
  }
}

export async function getStoreStatus(): Promise<{
  backend: 'redis' | 'memory';
  cached: boolean;
  ageSeconds: number;
  accounts: number;
  tags: number;
}> {
  if (redis) {
    const meta = await redis.get<TagMeta>(META_KEY);
    return {
      backend: 'redis',
      cached: meta !== null,
      ageSeconds: meta ? Math.floor((Date.now() - meta.updatedAt) / 1000) : -1,
      accounts: meta?.accounts ?? 0,
      tags: meta?.tags ?? 0,
    };
  }
  return {
    backend: 'memory',
    cached: memTags !== null,
    ageSeconds: memTags ? Math.floor((Date.now() - memUpdatedAt) / 1000) : -1,
    accounts: memTags ? countAccounts(memTags) : 0,
    tags: memTags?.length ?? 0,
  };
}
