import { NextResponse } from 'next/server';
import { fetchAllCampaigns, fetchCampaignEmailAccounts } from '@/lib/smartlead';

export async function GET() {
  try {
    const campaigns = await fetchAllCampaigns();
    // Fetch sender counts with limited concurrency
    const CONCURRENCY = 5;
    const results = [...campaigns];
    for (let i = 0; i < results.length; i += CONCURRENCY) {
      const batch = results.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (c, idx) => {
          try {
            const accounts = await fetchCampaignEmailAccounts(c.id);
            results[i + idx] = { ...c, sender_count: accounts.length };
          } catch {
            results[i + idx] = { ...c, sender_count: 0 };
          }
        })
      );
    }
    return NextResponse.json({ campaigns: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
