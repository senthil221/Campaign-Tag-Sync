'use client';
import { useState, useMemo } from 'react';
import type { Campaign } from '@/types';

interface Props {
  campaigns: Campaign[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelectFiltered: (ids: number[]) => void;
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

export default function CampaignSelector({
  campaigns, selectedIds, onToggle, onSelectFiltered, onClearAll, loading, onRefresh,
}: Props) {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // Collect all unique campaign tags
  const allCampaignTags = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach(c => (c.tags ?? []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [campaigns]);

  // Apply both search and tag filter
  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !tagFilter || (c.tags ?? []).includes(tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [campaigns, search, tagFilter]);

  const filteredIds = filtered.map(c => c.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Campaigns</span>
          {campaigns.length > 0 && <span className="pill">{campaigns.length}</span>}
          {selectedIds.size > 0 && (
            <span className="pill pill-accent">{selectedIds.size} selected</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {filtered.length > 0 && (
            <>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => onSelectFiltered(filteredIds)}
                title={search || tagFilter ? 'Select visible campaigns only' : 'Select all'}
              >
                {allFilteredSelected ? 'Deselect' : 'Select'} {search || tagFilter ? `${filtered.length}` : 'All'}
              </button>
              {selectedIds.size > 0 && (
                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onClearAll}>
                  Clear
                </button>
              )}
            </>
          )}
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onRefresh} disabled={loading}>
            {loading ? <span className="spinner" /> : <RefreshIcon />}
          </button>
        </div>
      </div>

      {/* Search + Tag filter row */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder="Search campaigns…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />

        {/* Tag filter button */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost"
            style={{
              padding: '7px 10px',
              borderColor: tagFilter ? 'var(--accent)' : 'var(--border)',
              color: tagFilter ? 'var(--accent)' : 'var(--text-muted)',
              gap: 4,
            }}
            onClick={() => setShowTagDropdown(v => !v)}
            title="Filter by campaign tag"
          >
            <FilterIcon />
            {tagFilter ? (
              <span style={{ fontSize: 11, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tagFilter}
              </span>
            ) : (
              <span style={{ fontSize: 11 }}>Tag</span>
            )}
          </button>

          {showTagDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                minWidth: 200,
                maxWidth: 280,
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 20,
                overflow: 'hidden',
              }}
              className="fade-in"
            >
              {/* Clear option */}
              <div
                style={{
                  padding: '9px 14px',
                  fontSize: 12,
                  color: tagFilter ? 'var(--text-muted)' : 'var(--text)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  fontWeight: tagFilter ? 400 : 600,
                }}
                onClick={() => { setTagFilter(''); setShowTagDropdown(false); }}
              >
                All campaigns
              </div>
              {allCampaignTags.length === 0 ? (
                <div style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text-faint)' }}>No campaign tags found</div>
              ) : (
                allCampaignTags.map(tag => (
                  <div
                    key={tag}
                    style={{
                      padding: '9px 14px',
                      fontSize: 12,
                      color: tagFilter === tag ? 'var(--accent)' : 'var(--text-2)',
                      background: tagFilter === tag ? 'var(--accent-dim)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.1s',
                    }}
                    onClick={() => { setTagFilter(tag); setShowTagDropdown(false); }}
                  >
                    <span>{tag}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {campaigns.filter(c => (c.tags ?? []).includes(tag)).length}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active filter indicator */}
      {(search || tagFilter) && (
        <div style={{
          padding: '5px 12px',
          background: 'var(--panel-3)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          <span>Showing {filtered.length} of {campaigns.length}</span>
          {tagFilter && (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', background: 'var(--accent-dim)', borderRadius: 4, color: 'var(--accent)', cursor: 'pointer' }}
              onClick={() => setTagFilter('')}
            >
              {tagFilter} ×
            </span>
          )}
          {search && (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', background: 'var(--panel-3)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
              onClick={() => setSearch('')}
            >
              "{search}" ×
            </span>
          )}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }} onClick={() => showTagDropdown && setShowTagDropdown(false)}>
        {loading && campaigns.length === 0 ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 20, height: 20 }} />
            <span>Loading campaigns…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 22, opacity: 0.3 }}>◫</span>
            <span>{search || tagFilter ? 'No matches' : 'No campaigns'}</span>
            {!search && !tagFilter && (
              <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={onRefresh}>Load campaigns</button>
            )}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <span className="mono">#{c.id}</span>
                      {c.sender_count !== undefined && <span> · {c.sender_count} senders</span>}
                      {c.created_at && <span> · {formatDate(c.created_at)}</span>}
                    </span>
                    {(c.tags ?? []).map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: tag === tagFilter ? 'var(--accent-dim)' : 'var(--panel-3)',
                          border: `1px solid ${tag === tagFilter ? 'var(--accent)' : 'var(--border)'}`,
                          color: tag === tagFilter ? 'var(--accent)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        onClick={e => { e.stopPropagation(); setTagFilter(tagFilter === tag ? '' : tag); }}
                      >
                        {tag}
                      </span>
                    ))}
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
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

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 3h10M3.5 6.5h6M5.5 10h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
