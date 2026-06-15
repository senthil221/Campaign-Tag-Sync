import { getAccountHealth } from '@/types';
import type { AccountChunk, EmailAccount, FlatAccount, TagGroup } from '@/types';

/**
 * Client-side, rate-limit-aware loader for the full tag/account dataset.
 *
 * The full 20k-account fetch can't finish inside one serverless invocation
 * within Smartlead's ~60 req/min limit, so instead of one long request we pull
 * one page at a time from `/api/tags/chunk`, pace ourselves between pages, and
 * back off when the API reports a rate limit. Progress is reported as we go and
 * the assembled result is cached in localStorage so revisits are instant.
 */

// Page size and pacing are tunable without a code change. Defaults are
// deliberately conservative to stay under Smartlead's limit.
const PAGE_SIZE = Number(process.env.NEXT_PUBLIC_SMARTLEAD_PAGE_SIZE) || 100;
const BASE_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_FETCH_INTERVAL_MS) || 1200; // ~50 req/min
const MAX_INTERVAL_MS = 5000;
const MAX_BACKOFF_MS = 90_000;

const CACHE_KEY = 'sender-sync.tags.v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface LoadProgress {
  loaded: number;
  total: number | null;
}

interface CachePayload {
  updatedAt: number;
  tags: TagGroup[];
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });

export function readCachedTags(): { tags: TagGroup[]; updatedAt: number; stale: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as CachePayload;
    if (!payload?.tags?.length) return null;
    return {
      tags: payload.tags,
      updatedAt: payload.updatedAt,
      stale: Date.now() - payload.updatedAt > CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

function writeCachedTags(tags: TagGroup[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachePayload = { updatedAt: Date.now(), tags };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded or storage unavailable — non-fatal, we just won't cache.
  }
}

function groupByTag(accounts: FlatAccount[]): TagGroup[] {
  const tagMap = new Map<string, EmailAccount[]>();
  for (const a of accounts) {
    const acc: EmailAccount = {
      id: a.id,
      from_email: a.from_email,
      is_smtp_success: a.is_smtp_success,
      is_imap_success: a.is_imap_success,
    };
    for (const name of a.tags) {
      let list = tagMap.get(name);
      if (!list) { list = []; tagMap.set(name, list); }
      list.push(acc);
    }
  }

  return [...tagMap.keys()].sort().map(name => {
    const accs = tagMap.get(name)!;
    const health = accs.reduce(
      (h, a) => { h[getAccountHealth(a)]++; h.total++; return h; },
      { total: 0, active: 0, disconnected: 0, unknown: 0 }
    );
    return { name, accounts: accs, count: accs.length, health };
  });
}

/**
 * Pull every account page, paced under the rate limit, group by tag, and cache.
 * Reports progress via `onProgress`. Pass an `AbortSignal` to cancel.
 */
export async function loadAllTags(opts: {
  onProgress?: (p: LoadProgress) => void;
  signal?: AbortSignal;
} = {}): Promise<TagGroup[]> {
  const { onProgress, signal } = opts;

  const all: FlatAccount[] = [];
  const seen = new Set<number>();
  let offset = 0;
  let total: number | null = null;
  let interval = BASE_INTERVAL_MS;

  onProgress?.({ loaded: 0, total: null });

  for (;;) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const res = await fetch(`/api/tags/chunk?offset=${offset}&limit=${PAGE_SIZE}`, {
      signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      let msg = `Failed to load accounts (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) msg = body.error as string;
      } catch { /* keep generic message */ }
      throw new Error(msg);
    }

    const chunk = (await res.json()) as AccountChunk;

    if (chunk.rateLimited) {
      const wait = Math.min((chunk.retryAfter ?? 60) * 1000, MAX_BACKOFF_MS);
      // Ease off the throttle so we don't immediately re-trip the limit.
      interval = Math.min(interval * 1.5, MAX_INTERVAL_MS);
      await sleep(wait, signal);
      continue; // retry the same offset
    }

    for (const a of chunk.accounts) {
      if (!seen.has(a.id)) { seen.add(a.id); all.push(a); }
    }
    if (chunk.total !== null) total = chunk.total;
    onProgress?.({ loaded: all.length, total });

    if (chunk.nextOffset === null) break;
    offset = chunk.nextOffset;

    await sleep(interval, signal);
  }

  const tags = groupByTag(all);
  writeCachedTags(tags);
  return tags;
}
