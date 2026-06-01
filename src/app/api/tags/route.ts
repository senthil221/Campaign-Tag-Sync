import { NextResponse } from 'next/server';
import { fetchAllEmailAccountsWithTags } from '@/lib/smartlead';

export async function GET() {
  try {
    const tags = await fetchAllEmailAccountsWithTags();
    return NextResponse.json({ tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
