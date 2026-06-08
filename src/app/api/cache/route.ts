import { NextResponse } from 'next/server';
import { getCacheStatus, invalidateTagCache, getTagsWithCache } from '@/lib/tag-cache';

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(getCacheStatus());
}

// POST /api/cache — invalidate and optionally warm the cache
export async function POST() {
  invalidateTagCache();
  // Kick off background warm-up so the next user request hits cache
  getTagsWithCache().catch(() => null);
  return NextResponse.json({ message: 'Cache invalidated, warming in background' });
}
