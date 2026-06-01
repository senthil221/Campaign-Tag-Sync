'use client';
import type { Campaign, TagGroup } from '@/types';

interface Props {
  selectedCampaigns: Campaign[];
  selectedTag: TagGroup | null;
  syncMode: 'replace' | 'add' | 'remove';
  onModeChange: (mode: 'replace' | 'add' | 'remove') => void;
  onPreview: () => void;
  previewLoading: boolean;
}

const MODES: { value: 'replace' | 'add' | 'remove'; label: string; desc: string; color: string }[] = [
  { value: 'replace', label: 'Replace', desc: 'Set campaign senders to exactly this tag', color: 'var(--accent)' },
  { value: 'add', label: 'Add Only', desc: 'Add tag accounts without removing others', color: 'var(--green)' },
  { value: 'remove', label: 'Remove Only', desc: 'Remove tag accounts from campaigns', color: 'var(--red)' },
];

export default function SyncPanel({
  selectedCampaigns, selectedTag, syncMode, onModeChange, onPreview, previewLoading
}: Props) {
  const ready = selectedCampaigns.length > 0 && selectedTag !== null;

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

        {/* Selection summary */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="label" style={{ marginBottom: 8 }}>Selection</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '8px 14px' }}>
              <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>Campaigns</div>
              <div style={{ fontSize: 18, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: selectedCampaigns.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                {selectedCampaigns.length}
              </div>
            </div>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '8px 14px' }}>
              <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>Tag</div>
              <div style={{ fontSize: 13, color: selectedTag ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedTag ? selectedTag.name : '—'}
              </div>
              {selectedTag && (
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{selectedTag.count} accounts</div>
              )}
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ flex: 2, minWidth: 300 }}>
          <div className="label" style={{ marginBottom: 8 }}>Sync Mode</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => onModeChange(m.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1px solid ${syncMode === m.value ? m.color : 'var(--border)'}`,
                  borderRadius: 3,
                  background: syncMode === m.value ? `rgba(${m.color === 'var(--accent)' ? '0,229,255' : m.color === 'var(--green)' ? '0,255,136' : '255,68,102'}, 0.08)` : 'var(--surface-2)',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: syncMode === m.value ? m.color : 'var(--text)', letterSpacing: '0.05em', marginBottom: 3 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
          <button
            className="btn btn-primary"
            onClick={onPreview}
            disabled={!ready || previewLoading}
            style={{ height: 44, fontSize: 13, paddingInline: 28 }}
          >
            {previewLoading ? (
              <><span className="spinner" style={{ borderTopColor: '#000' }} /> Computing...</>
            ) : (
              <>Preview Sync →</>
            )}
          </button>
        </div>
      </div>

      {!ready && (
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
          {selectedCampaigns.length === 0 && <span>◦ Select at least one campaign</span>}
          {!selectedTag && <span>◦ Select an email tag</span>}
        </div>
      )}
    </div>
  );
}
