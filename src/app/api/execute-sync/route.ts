import { NextRequest, NextResponse } from 'next/server';
import { addSendersToCampaign, removeSendersFromCampaign } from '@/lib/smartlead';
import type { CampaignSyncPreview, SyncResult } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { previews } = body as { previews: CampaignSyncPreview[] };

    if (!previews?.length) return NextResponse.json({ error: 'No previews provided' }, { status: 400 });

    const CONCURRENCY = 2; // Low concurrency for safety
    const results: SyncResult[] = new Array(previews.length);

    for (let i = 0; i < previews.length; i += CONCURRENCY) {
      const batch = previews.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (preview, idx) => {
          if (preview.error) {
            results[i + idx] = {
              campaign_id: preview.campaign_id,
              campaign_name: preview.campaign_name,
              status: 'error',
              added: 0,
              removed: 0,
              error: preview.error,
            };
            return;
          }

          // Safety: never remove all senders from an active campaign
          const afterRemove = preview.current_ids.length + preview.to_add.length - preview.to_remove.length;
          if (afterRemove <= 0 && preview.to_remove.length > 0) {
            results[i + idx] = {
              campaign_id: preview.campaign_id,
              campaign_name: preview.campaign_name,
              status: 'error',
              added: 0,
              removed: 0,
              error: 'Safety check: operation would remove all senders. Skipped.',
            };
            return;
          }

          try {
            // Always add first, then remove (for replace mode safety)
            if (preview.to_add.length > 0) {
              await addSendersToCampaign(preview.campaign_id, preview.to_add);
            }
            if (preview.to_remove.length > 0) {
              await removeSendersFromCampaign(preview.campaign_id, preview.to_remove);
            }
            results[i + idx] = {
              campaign_id: preview.campaign_id,
              campaign_name: preview.campaign_name,
              status: 'success',
              added: preview.to_add.length,
              removed: preview.to_remove.length,
            };
          } catch (err) {
            results[i + idx] = {
              campaign_id: preview.campaign_id,
              campaign_name: preview.campaign_name,
              status: 'error',
              added: 0,
              removed: 0,
              error: err instanceof Error ? err.message : 'Unknown error during sync',
            };
          }
        })
      );
      // Small delay between batches
      if (i + CONCURRENCY < previews.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
