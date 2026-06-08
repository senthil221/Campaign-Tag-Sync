import { NextResponse } from 'next/server';
import { getTagsWithCache } from '@/lib/tag-cache';

export const maxDuration = 60;

export async function GET() {
  try {
    const tags = await getTagsWithCache();
    return NextResponse.json({ tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
