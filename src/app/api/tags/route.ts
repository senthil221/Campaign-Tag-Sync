import { NextResponse } from 'next/server';
import { getTags } from '@/lib/tag-store';

// 20k accounts = 200 pages (Smartlead caps at 100/page). The full fetch can
// take well over 60s, so allow the max (Vercel Pro supports up to 300s).
export const maxDuration = 300;

export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json({ tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
