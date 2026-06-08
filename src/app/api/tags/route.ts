import { NextResponse } from 'next/server';
import { getTags } from '@/lib/tag-store';

export const maxDuration = 60;

export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json({ tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
