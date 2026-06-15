import { NextRequest, NextResponse } from 'next/server';
import { fetchAccountChunk } from '@/lib/smartlead';

// One page per request — short and comfortably under any platform timeout.
// The client loops over offsets, paces itself, and backs off on rate limits.
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Smartlead caps a page at 100, but allow callers to ask for more in case a
// larger window works on a given account (configurable client-side).
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const offset = Math.max(0, Math.floor(Number(sp.get('offset')) || 0));
    const requested = Math.floor(Number(sp.get('limit')) || 100);
    const limit = Math.min(Math.max(1, requested), MAX_LIMIT);

    const chunk = await fetchAccountChunk(offset, limit);
    return NextResponse.json(chunk);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
