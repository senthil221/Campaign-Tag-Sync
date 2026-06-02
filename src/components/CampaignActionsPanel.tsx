'use client';
import { useState } from 'react';
import type { Campaign, ActionResult } from '@/types';

type ActionKey = 'reallocate' | 'reschedule';

interface Props {
  selectedCampaigns: Campaign[];
  onReallocate: (ids: number[], nameMap: Record<number, string>) => Promise<ActionResult[]>;
  onReschedule: (ids: number[], nameMap: Record<number, string>) => Promise<ActionResult[]>;
}

const ACTIONS: { key: ActionKey; label: string; desc: string }[] = [
  { key: 'reallocate', label: 'Reallocate Mailboxes',    desc: 'Rebalance mailbox assignments across campaigns' },
  { key: 'reschedule', label: 'Reschedule Failed Leads', desc: 'Re-queue leads that failed to send' },
];

export default function CampaignActionsPanel({ selectedCampaigns, onReallocate, onReschedule }: Props) {
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ action: ActionKey; items: ActionResult[] } | null>(null);

  const count = selectedCampaigns.length;

  const nameMap = Object.fromEntries(selectedCampaigns.map(c => [c.id, c.name])) as Record<number, string>;
  const ids = selectedCampaigns.map(c => c.id);

  const handleConfirm = async () => {
    if (!pending || count === 0) return;
    setRunning(true);
    try {
      const items = pending === 'reallocate'
        ? await onReallocate(ids, nameMap)
        : await onReschedule(ids, nameMap);
      setResults({ action: pending, items });
    } finally {
      setRunning(false);
      setPending(null);
    }
  };

  const actionLabel = (key: ActionKey) => ACTIONS.find(a => a.key === key)?.label ?? key;

  const successCount = results?.items.filter(r => r.status === 'success').length ?? 0;
  const errorItems   = results?.items.filter(r => r.status === 'error')   ?? [];

  return (
    <div className="panel" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, width: 200, flexShrink: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-label" style={{ fontSize: 10 }}>Campaign Actions</div>
        {count > 0 && <span className="pill pill-accent">{count}</span>}
      </div>

      {/* Confirm state */}
      {pending && (
        <div style={{
          background: 'var(--panel-3)',
          border: '1px solid var(--warning)',
          borderRadius: 7,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{actionLabel(pending)}</span>
            {' on '}
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{count} campaign{count !== 1 ? 's' : ''}</span>?
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '4px 8px' }}
              onClick={() => setPending(null)} disabled={running}>
              Cancel
            </button>
            <button className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '4px 8px', background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }}
              onClick={handleConfirm} disabled={running}>
              {running
                ? <><span className="spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000', width: 10, height: 10 }} />…</>
                : 'Run'}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!pending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ACTIONS.map(a => (
            <button
              key={a.key}
              title={a.desc}
              disabled={count === 0}
              onClick={() => { setResults(null); setPending(a.key); }}
              className="btn btn-ghost"
              style={{
                justifyContent: 'flex-start',
                fontSize: 12,
                padding: '7px 10px',
                opacity: count === 0 ? 0.4 : 1,
                cursor: count === 0 ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {results && !pending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{
            background: errorItems.length > 0 ? 'rgba(255,80,80,0.06)' : 'rgba(0,255,128,0.06)',
            border: `1px solid ${errorItems.length > 0 ? 'var(--danger)' : 'var(--success)'}`,
            borderRadius: 7,
            padding: '6px 10px',
            fontSize: 11,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>{successCount} done</span>
              {errorItems.length > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}> · {errorItems.length} failed</span>}
            </span>
            <button className="btn btn-ghost" style={{ padding: '1px 5px', fontSize: 10 }} onClick={() => setResults(null)}>×</button>
          </div>
          {errorItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 100, overflowY: 'auto' }}>
              {errorItems.map(r => (
                <div key={r.campaign_id} style={{ fontSize: 10, color: 'var(--danger)', background: 'var(--panel-3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 7px', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.campaign_name}: </span>{r.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {count === 0 && !results && !pending && (
        <div style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', padding: '4px 0' }}>
          Select campaigns to enable
        </div>
      )}
    </div>
  );
}
