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
    <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-label">Campaign Actions</div>
        {count > 0 && (
          <span className="pill pill-accent">{count} selected</span>
        )}
      </div>

      {/* Confirm state */}
      {pending && (
        <div style={{
          background: 'var(--panel-3)',
          border: '1px solid var(--warning)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Run <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{actionLabel(pending)}</span> on{' '}
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{count} campaign{count !== 1 ? 's' : ''}</span>?
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
              onClick={() => setPending(null)}
              disabled={running}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', fontSize: 12, background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }}
              onClick={handleConfirm}
              disabled={running}
            >
              {running
                ? <><span className="spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000' }} />Running…</>
                : 'Run'
              }
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!pending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ACTIONS.map(a => (
            <button
              key={a.key}
              disabled={count === 0}
              onClick={() => { setResults(null); setPending(a.key); }}
              style={{
                padding: '10px 12px',
                border: `1px solid var(--border)`,
                borderRadius: 8,
                background: 'var(--panel-2)',
                cursor: count === 0 ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                opacity: count === 0 ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{a.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {results && !pending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
          }}>
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {actionLabel(results.action)}
            </span>
            <button
              className="btn btn-ghost"
              style={{ padding: '2px 6px', fontSize: 11 }}
              onClick={() => setResults(null)}
            >
              Clear
            </button>
          </div>
          <div style={{
            background: errorItems.length > 0 ? 'rgba(255,80,80,0.06)' : 'rgba(0,255,128,0.06)',
            border: `1px solid ${errorItems.length > 0 ? 'var(--danger)' : 'var(--success)'}`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
          }}>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{successCount} done</span>
            {errorItems.length > 0 && (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}> · {errorItems.length} failed</span>
            )}
          </div>
          {errorItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
              {errorItems.map(r => (
                <div key={r.campaign_id} style={{
                  fontSize: 11,
                  color: 'var(--danger)',
                  background: 'var(--panel-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '5px 8px',
                  lineHeight: 1.4,
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.campaign_name}: </span>
                  {r.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {count === 0 && !results && !pending && (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>
          Select campaigns to enable actions
        </div>
      )}
    </div>
  );
}
