'use client';
import { useState, useMemo } from 'react';
import type { Campaign } from '@/types';

interface Props {
  campaigns: Campaign[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  loading: boolean;
  onRefresh: () => void;
}

function statusBadgeClass(status: string) {
  const s = status?.toUpperCase();
  if (s === 'ACTIVE' || s === 'RUNNING') return 'badge badge-active';
  if (s === 'PAUSED') return 'badge badge-paused';
  if (s === 'COMPLETED' || s === 'STOPPED') return 'badge badge-completed';
  return 'badge badge-draft';
}

export default function CampaignSelector({
  campaigns, selectedIds, onToggle, onSelectAll, onClearAll, loading, onRefresh
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [campaigns, search]
  );

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="label label-accent">Campaigns</span>
          <span className="stat-pill">{campaigns.length} total</span>
          {selectedIds.size > 0 && (
            <span className="stat-pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}>
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {campaigns.length > 0 && (
            <>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={onSelectAll}>
                All
              </button>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={onClearAll}>
                Clear
              </button>
            </>
          )}
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={onRefresh} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '↻'}
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <input
          className="input"
          placeholder="Search campaigns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 10px' }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && campaigns.length === 0 ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 20, height: 20 }} />
            <span>Loading campaigns...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 24 }}>◫</span>
            <span>{search ? 'No matches' : 'No campaigns found'}</span>
            {!search && <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={onRefresh}>Fetch campaigns</button>}
          </div>
        ) : (
          filtered.map(c => {
            const checked = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                className={`row-item fade-in${checked ? ' selected' : ''}`}
                onClick={() => onToggle(c.id)}
              >
                <div className={`checkbox${checked ? ' checked' : ''}`}>
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                    id:{c.id} · {c.sender_count ?? '?'} senders
                  </div>
                </div>
                <span className={statusBadgeClass(c.status)}>
                  {c.status?.toLowerCase() ?? 'unknown'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
