import { NextRequest, NextResponse } from 'next/server';
import { getTags } from '@/lib/tag-store';

export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tagName: string }> }) {
  try {
    const { tagName } = await params;
    const decoded = decodeURIComponent(tagName);
    const tags = await getTags();
    const tag = tags.find(t => t.name === decoded);
    if (!tag) {
      return NextResponse.json({ error: `Tag "${decoded}" not found` }, { status: 404 });
    }
    return NextResponse.json({ tag });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
