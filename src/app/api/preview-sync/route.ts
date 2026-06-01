import { NextRequest, NextResponse } from 'next/server';
import { fetchCampaignEmailAccounts } from '@/lib/smartlead';
import type { CampaignSyncPreview } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_ids, tag_account_ids, mode } = body as {
      campaign_ids: number[];
      tag_account_ids: number[];
      mode: 'replace' | 'add' | 'remove';
    };

    if (!campaign_ids?.length) return NextResponse.json({ error: 'No campaigns selected' }, { status: 400 });
    if (!tag_account_ids?.length) return NextResponse.json({ error: 'No tag accounts provided' }, { status: 400 });
    if (!['replace', 'add', 'remove'].includes(mode)) return NextResponse.json({ error: 'Invalid sync mode' }, { status: 400 });

    const desiredSet = new Set(tag_account_ids);

    const CONCURRENCY = 3;
    const previews: CampaignSyncPreview[] = new Array(campaign_ids.length);

    for (let i = 0; i < campaign_ids.length; i += CONCURRENCY) {
      const batch = campaign_ids.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (cid, idx) => {
          try {
            const currentAccounts = await fetchCampaignEmailAccounts(cid);
            const currentIds = currentAccounts.map(a => a.id);
            const currentSet = new Set(currentIds);

            let toAdd: number[] = [];
            let toRemove: number[] = [];

            if (mode === 'replace') {
              toAdd = tag_account_ids.filter(id => !currentSet.has(id));
              toRemove = currentIds.filter(id => !desiredSet.has(id));
            } else if (mode === 'add') {
              toAdd = tag_account_ids.filter(id => !currentSet.has(id));
            } else if (mode === 'remove') {
              toRemove = currentIds.filter(id => desiredSet.has(id));
            }

            previews[i + idx] = {
              campaign_id: cid,
              campaign_name: body.campaign_names?.[cid] ?? `Campaign ${cid}`,
              current_ids: currentIds,
              desired_ids: tag_account_ids,
              to_add: toAdd,
              to_remove: toRemove,
            };
          } catch (err) {
            previews[i + idx] = {
              campaign_id: cid,
              campaign_name: body.campaign_names?.[cid] ?? `Campaign ${cid}`,
              current_ids: [],
              desired_ids: tag_account_ids,
              to_add: [],
              to_remove: [],
              error: err instanceof Error ? err.message : 'Failed to fetch current senders',
            };
          }
        })
      );
    }

    return NextResponse.json({ previews });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
