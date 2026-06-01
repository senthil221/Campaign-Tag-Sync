import { NextResponse } from 'next/server';
import { fetchAllCampaigns, fetchCampaignEmailAccounts, fetchRawCampaignSample } from '@/lib/smartlead';

export async function GET(req: import('next/server').NextRequest) {
  // Debug endpoint: /api/campaigns?debug=1 returns raw first campaign object
  if (req.nextUrl.searchParams.get('debug') === '1') {
    try {
      const sample = await fetchRawCampaignSample();
      return NextResponse.json({ sample });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'error' }, { status: 500 });
    }
  }

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
