import { NextRequest, NextResponse } from 'next/server';
import { refreshTags } from '@/lib/tag-store';

// Background refresh can run long (full 20k-account fetch with gentle pacing).
// Vercel Pro allows up to 300s; Hobby caps at 60s.
export const maxDuration = 300;

/**
 * Background refresh, invoked by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set, which we
 * verify so the endpoint can't be triggered by the public.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const meta = await refreshTags();
    return NextResponse.json({ ok: true, ...meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
