'use client';
import type { CampaignSyncPreview, SyncResult } from '@/types';

interface Props {
  previews: CampaignSyncPreview[];
  syncMode: 'replace' | 'add' | 'remove';
  tagName: string;
  onConfirm: () => void;
  onCancel: () => void;
  executing: boolean;
  results: SyncResult[] | null;
}

export default function PreviewModal({ previews, syncMode, tagName, onConfirm, onCancel, executing, results }: Props) {
  const totalAdd = previews.reduce((s, p) => s + p.to_add.length, 0);
  const totalRemove = previews.reduce((s, p) => s + p.to_remove.length, 0);
  const hasErrors = previews.some(p => p.error);
  const hasChanges = totalAdd > 0 || totalRemove > 0;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !executing) onCancel(); }}>
      <div
        className="panel fade-in"
        style={{ width: '100%', maxWidth: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="panel-header">
          <div>
            <span className="label label-accent">Sync Preview</span>
            <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--text-dim)' }}>
              {syncMode.toUpperCase()} · tag: <span style={{ color: 'var(--green)' }}>{tagName}</span>
            </span>
          </div>
          {!executing && !results && (
            <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Summary bar */}
        {!results && (
          <div style={{ display: 'flex', gap: 24, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Barlow Condensed'", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Campaigns</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{previews.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Barlow Condensed'", letterSpacing: '0.1em', textTransform: 'uppercase' }}>To Add</span>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>+{totalAdd}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Barlow Condensed'", letterSpacing: '0.1em', textTransform: 'uppercase' }}>To Remove</span>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>-{totalRemove}</span>
            </div>
            {hasErrors && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: "'Barlow Condensed'", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Errors</span>
                <span style={{ color: 'var(--red)', fontWeight: 700 }}>{previews.filter(p => p.error).length}</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results ? (
            // Results view
            results.map(r => (
              <div
                key={r.campaign_id}
                style={{
                  padding: '12px 16px',
                  border: `1px solid ${r.status === 'success' ? 'var(--border)' : 'var(--red)'}`,
                  borderRadius: 3,
                  background: r.status === 'error' ? 'var(--red-dim)' : 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 16 }}>{r.status === 'success' ? '✓' : '✗'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.campaign_name}</div>
                  {r.error ? (
                    <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2 }}>{r.error}</div>
                  ) : (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                      +{r.added} added · -{r.removed} removed
                    </div>
                  )}
                </div>
                <span style={{ color: r.status === 'success' ? 'var(--green)' : 'var(--red)', fontSize: 11, fontWeight: 600 }}>
                  {r.status}
                </span>
              </div>
            ))
          ) : (
            // Preview rows
            previews.map(p => (
              <div
                key={p.campaign_id}
                style={{
                  border: `1px solid ${p.error ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 3,
                  background: p.error ? 'var(--red-dim)' : 'var(--surface-2)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.campaign_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                      id:{p.campaign_id} · current: {p.current_ids.length} senders
                    </div>
                  </div>
                  {p.error ? (
                    <span style={{ fontSize: 10, color: 'var(--red)' }}>{p.error}</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {p.to_add.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 2 }}>
                          +{p.to_add.length}
                        </span>
                      )}
                      {p.to_remove.length > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)', padding: '2px 8px', borderRadius: 2 }}>
                          -{p.to_remove.length}
                        </span>
                      )}
                      {p.to_add.length === 0 && p.to_remove.length === 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>no change</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'var(--surface-2)' }}>
          {results ? (
            <button className="btn btn-ghost" onClick={onCancel}>Close</button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onCancel} disabled={executing}>Cancel</button>
              {!hasChanges ? (
                <button className="btn btn-ghost" disabled>No Changes</button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={onConfirm}
                  disabled={executing || hasErrors}
                >
                  {executing ? (
                    <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#000' }} /> Syncing...</>
                  ) : (
                    `Confirm Sync · ${previews.filter(p => !p.error).length} campaigns`
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
