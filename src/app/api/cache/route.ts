import { NextResponse } from 'next/server';
import { getStoreStatus, invalidateTags, refreshTags } from '@/lib/tag-store';

export const maxDuration = 300;

// GET /api/cache — inspect cache status (age, counts)
export async function GET() {
  return NextResponse.json(getStoreStatus());
}

// POST /api/cache — force a synchronous refresh (manual "refresh now")
export async function POST() {
  try {
    invalidateTags();
    const meta = await refreshTags();
    return NextResponse.json({ message: 'Refreshed', ...meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
