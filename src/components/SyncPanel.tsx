'use client';
import type { Campaign, TagGroup } from '@/types';

interface Props {
  selectedCampaigns: Campaign[];
  selectedTag: TagGroup | null;
  syncMode: 'replace' | 'add' | 'remove';
  onModeChange: (mode: 'replace' | 'add' | 'remove') => void;
  useOnlyActive: boolean;
  onToggleActive: () => void;
  onPreview: () => void;
  previewLoading: boolean;
}

const MODES: { value: 'replace' | 'add' | 'remove'; label: string; desc: string }[] = [
  { value: 'replace', label: 'Replace',     desc: 'Set senders to exactly this tag' },
  { value: 'add',     label: 'Add Only',    desc: 'Add accounts, keep existing ones' },
  { value: 'remove',  label: 'Remove Only', desc: 'Remove tag accounts from campaigns' },
];

export default function SyncPanel({
  selectedCampaigns, selectedTag, syncMode, onModeChange,
  useOnlyActive, onToggleActive, onPreview, previewLoading,
}: Props) {
  const ready = selectedCampaigns.length > 0 && selectedTag !== null;
  const { health } = selectedTag ?? { health: null };
  const willUse = health ? (useOnlyActive ? health.active : health.total) : 0;
  const skipped = health && useOnlyActive ? health.disconnected : 0;

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Selection summary */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <StatCard label="Campaigns" value={selectedCampaigns.length} active={selectedCampaigns.length > 0} color="var(--accent)" />
          <StatCard label="Tag" value={selectedTag?.name ?? '—'} active={!!selectedTag} color="var(--success)" isText />
          {selectedTag && (
            <StatCard label="Will use" value={willUse} active={willUse > 0} color={skipped > 0 ? 'var(--warning)' : 'var(--success)'} />
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />

        {/* Mode selector */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Sync Mode</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => onModeChange(m.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: `1px solid ${syncMode === m.value ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8,
                  background: syncMode === m.value ? 'var(--accent-dim)' : 'var(--panel-2)',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: syncMode === m.value ? 'var(--accent)' : 'var(--text)', marginBottom: 2 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />

        {/* Active toggle + action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'space-between' }}>
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Filter</div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
              onClick={onToggleActive}
            >
              <div className={`toggle${useOnlyActive ? ' on' : ''}`} />
              <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
                Use only active accounts
              </span>
            </div>
            {selectedTag && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                {useOnlyActive
                  ? <><span style={{ color: 'var(--success)' }}>{willUse} active</span> will be used{skipped > 0 && <> · <span style={{ color: 'var(--danger)' }}>{skipped} skipped</span></>}</>
                  : <span>{willUse} accounts included</span>
                }
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={onPreview}
            disabled={!ready || previewLoading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {previewLoading
              ? <><span className="spinner" style={{ borderTopColor: '#fff' }} />Computing…</>
              : 'Preview Sync'
            }
          </button>
        </div>
      </div>

      {/* Not-ready hint */}
      {!ready && (
        <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-faint)' }}>
          {selectedCampaigns.length === 0 && <span>↑ Select at least one campaign</span>}
          {!selectedTag && <span>↑ Select an email tag</span>}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, active, color, isText = false }: {
  label: string; value: string | number; active: boolean; color: string; isText?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--panel-2)',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 8,
      padding: '8px 14px',
      minWidth: isText ? 90 : 64,
      transition: 'border-color 0.2s',
    }}>
      <div className="section-label" style={{ fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div style={{
        fontSize: isText ? 12 : 20,
        fontWeight: 700,
        color: active ? color : 'var(--text-faint)',
        fontFamily: isText ? 'Inter' : 'JetBrains Mono, monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: 120,
      }}>
        {value}
      </div>
    </div>
  );
}
