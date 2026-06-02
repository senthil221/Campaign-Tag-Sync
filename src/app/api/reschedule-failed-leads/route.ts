import { NextRequest, NextResponse } from 'next/server';
import { rescheduleFailedLeads } from '@/lib/smartlead';
import type { ActionResult } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { campaign_ids, campaign_names }: { campaign_ids: number[]; campaign_names: Record<number, string> } = await req.json();
    if (!Array.isArray(campaign_ids) || campaign_ids.length === 0) {
      return NextResponse.json({ error: 'campaign_ids required' }, { status: 400 });
    }
    const results: ActionResult[] = await Promise.all(
      campaign_ids.map(async (id) => {
        try {
          await rescheduleFailedLeads(id);
          return { campaign_id: id, campaign_name: campaign_names?.[id] ?? String(id), status: 'success' as const };
        } catch (err) {
          return {
            campaign_id: id,
            campaign_name: campaign_names?.[id] ?? String(id),
            status: 'error' as const,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      })
    );
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
