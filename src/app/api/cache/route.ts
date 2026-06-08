import { NextResponse } from 'next/server';
import { getStoreStatus, invalidateTags, refreshTags } from '@/lib/tag-store';

export const maxDuration = 60;

// GET /api/cache — inspect store status (backend, age, counts)
export async function GET() {
  try {
    return NextResponse.json(await getStoreStatus());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/cache — force a synchronous refresh (manual "refresh now" button)
export async function POST() {
  try {
    await invalidateTags();
    const meta = await refreshTags();
    return NextResponse.json({ message: 'Refreshed', ...meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
