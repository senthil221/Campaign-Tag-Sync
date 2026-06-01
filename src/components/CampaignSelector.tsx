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

function statusBadge(status: string) {
  const s = (status ?? '').toUpperCase();
  if (s === 'ACTIVE' || s === 'RUNNING') return <span className="badge badge-active">Active</span>;
  if (s === 'PAUSED') return <span className="badge badge-paused">Paused</span>;
  if (s === 'COMPLETED' || s === 'STOPPED') return <span className="badge badge-completed">Ended</span>;
  return <span className="badge badge-draft">{status?.toLowerCase() ?? 'unknown'}</span>;
}

export default function CampaignSelector({ campaigns, selectedIds, onToggle, onSelectAll, onClearAll, loading, onRefresh }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [campaigns, search]
  );

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Campaigns</span>
          {campaigns.length > 0 && (
            <span className="pill">{campaigns.length}</span>
          )}
          {selectedIds.size > 0 && (
            <span className="pill pill-accent">{selectedIds.size} selected</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {campaigns.length > 0 && (
            <>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onSelectAll}>All</button>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onClearAll}>Clear</button>
            </>
          )}
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onRefresh} disabled={loading}>
            {loading ? <span className="spinner" /> : <RefreshIcon />}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <input className="input" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && campaigns.length === 0 ? (
          <div className="empty-state"><span className="spinner" style={{ width: 20, height: 20 }} /><span>Loading campaigns…</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 22, opacity: 0.3 }}>◫</span>
            <span>{search ? 'No matches' : 'No campaigns'}</span>
            {!search && <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={onRefresh}>Load campaigns</button>}
          </div>
        ) : (
          filtered.map(c => {
            const checked = selectedIds.has(c.id);
            return (
              <div key={c.id} className={`row-item${checked ? ' selected' : ''}`} onClick={() => onToggle(c.id)}>
                <div className={`checkbox${checked ? ' checked' : ''}`}>
                  {checked && <CheckIcon />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    <span className="mono">#{c.id}</span>
                    {c.sender_count !== undefined && <span> · {c.sender_count} senders</span>}
                  </div>
                </div>
                {statusBadge(c.status)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
      <path d="M1 3.5L3.2 5.5L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M11.5 2A6 6 0 1 0 12 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 2h2.5V4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
