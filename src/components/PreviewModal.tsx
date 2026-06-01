'use client';
import type { CampaignSyncPreview, SyncResult } from '@/types';

interface Props {
  previews: CampaignSyncPreview[];
  syncMode: 'replace' | 'add' | 'remove';
  tagName: string;
  tagTotal: number;
  activeUsed: number;
  disconnectedSkipped: number;
  useOnlyActive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  executing: boolean;
  results: SyncResult[] | null;
}

export default function PreviewModal({
  previews, syncMode, tagName, tagTotal, activeUsed, disconnectedSkipped, useOnlyActive,
  onConfirm, onCancel, executing, results,
}: Props) {
  const validPreviews = previews.filter(p => !p.error);
  const errorPreviews = previews.filter(p => p.error);
  const totalAdd = validPreviews.reduce((s, p) => s + p.to_add.length, 0);
  const totalRemove = validPreviews.reduce((s, p) => s + p.to_remove.length, 0);
  const noChanges = totalAdd === 0 && totalRemove === 0 && validPreviews.length > 0;

  const successCount = results?.filter(r => r.status === 'success').length ?? 0;
  const failCount = results?.filter(r => r.status === 'error').length ?? 0;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !executing) onCancel(); }}>
      <div className="panel fade-in" style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: '85vh', borderRadius: 14 }}>

        {/* Header */}
        <div className="panel-header" style={{ borderRadius: '14px 14px 0 0' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {results ? 'Sync Complete' : 'Confirm Sync'}
            </span>
          </div>
          {!executing && (
            <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}>×</button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {results ? (
            /* Results view */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Summary */}
              <div style={{ display: 'flex', gap: 8 }}>
                {successCount > 0 && <span className="pill pill-success">✓ {successCount} synced</span>}
                {failCount > 0 && <span className="pill pill-danger">✗ {failCount} failed</span>}
              </div>
              {/* Per-campaign results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {results.map(r => (
                  <div key={r.campaign_id} style={{
                    padding: '10px 14px',
                    border: `1px solid ${r.status === 'error' ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: 8,
                    background: r.status === 'error' ? 'var(--danger-dim)' : 'var(--panel-2)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 14, color: r.status === 'success' ? 'var(--success)' : 'var(--danger)' }}>
                      {r.status === 'success' ? '✓' : '✗'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.campaign_name}</div>
                      {r.error
                        ? <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{r.error}</div>
                        : <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>+{r.added} added · -{r.removed} removed</div>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Confirmation summary */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary grid */}
              <div style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {[
                  { label: 'Campaigns selected', value: previews.length, mono: true },
                  { label: 'Selected tag', value: tagName, mono: false },
                  { label: 'Mode', value: syncMode.charAt(0).toUpperCase() + syncMode.slice(1), mono: false },
                  { label: 'Tag accounts', value: tagTotal, mono: true },
                  ...(useOnlyActive ? [
                    { label: 'Active (will be used)', value: activeUsed, mono: true, color: 'var(--success)' },
                    { label: 'Disconnected (skipped)', value: disconnectedSkipped, mono: true, color: disconnectedSkipped > 0 ? 'var(--danger)' : 'var(--text-muted)' },
                  ] : []),
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: row.mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                      color: (row as { color?: string }).color ?? 'var(--text)',
                    }}>
                      {String(row.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Change summary */}
              {!noChanges && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {totalAdd > 0 && <span className="pill pill-success">+{totalAdd} total adds</span>}
                  {totalRemove > 0 && <span className="pill pill-danger">-{totalRemove} total removes</span>}
                  {validPreviews.filter(p => p.to_add.length === 0 && p.to_remove.length === 0).length > 0 && (
                    <span className="pill">{validPreviews.filter(p => p.to_add.length === 0 && p.to_remove.length === 0).length} no change</span>
                  )}
                </div>
              )}

              {/* Per-campaign breakdown (compact) */}
              {validPreviews.length > 0 && !noChanges && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="section-label" style={{ marginBottom: 6 }}>Per campaign</div>
                  {validPreviews.map(p => (
                    <div key={p.campaign_id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      background: 'var(--panel-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                    }}>
                      <div style={{ flex: 1, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.campaign_name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {p.to_add.length > 0 && <span className="pill pill-success">+{p.to_add.length}</span>}
                        {p.to_remove.length > 0 && <span className="pill pill-danger">-{p.to_remove.length}</span>}
                        {p.to_add.length === 0 && p.to_remove.length === 0 && <span className="pill">no change</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {errorPreviews.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="section-label" style={{ marginBottom: 6, color: 'var(--danger)' }}>Errors</div>
                  {errorPreviews.map(p => (
                    <div key={p.campaign_id} style={{ padding: '8px 12px', background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 6, fontSize: 12, color: 'var(--danger)' }}>
                      <span style={{ color: 'var(--text)', marginRight: 6 }}>{p.campaign_name}:</span>{p.error}
                    </div>
                  ))}
                </div>
              )}

              {noChanges && (
                <div style={{ padding: '12px 16px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                  All campaigns are already up to date — no changes needed.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {results ? (
            <button className="btn btn-ghost" onClick={onCancel}>Close</button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onCancel} disabled={executing}>Cancel</button>
              {noChanges ? (
                <button className="btn btn-ghost" disabled>No Changes</button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={onConfirm}
                  disabled={executing || validPreviews.length === 0}
                >
                  {executing
                    ? <><span className="spinner" style={{ borderTopColor: '#fff' }} />Syncing…</>
                    : `Sync ${validPreviews.filter(p => p.to_add.length > 0 || p.to_remove.length > 0).length} campaigns`
                  }
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
