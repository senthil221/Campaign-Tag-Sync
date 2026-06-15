'use client';
import { useState, useMemo } from 'react';
import type { TagGroup } from '@/types';
import type { LoadProgress } from '@/lib/load-tags';

interface Props {
  tags: TagGroup[];
  selectedTag: string | null;
  onSelect: (tagName: string) => void;
  loading: boolean;
  progress?: LoadProgress | null;
  onRefresh: () => void;
}

export default function TagSelector({ tags, selectedTag, onSelect, loading, progress, onRefresh }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    tags.filter(t => t.name.toLowerCase().includes(search.toLowerCase())),
    [tags, search]
  );

  const loaded = progress?.loaded ?? 0;
  const total = progress?.total ?? null;
  const pct = total ? Math.min(100, Math.round((loaded / total) * 100)) : null;
  const progressLabel = loading
    ? `Loading ${loaded.toLocaleString()}${total ? ` / ${total.toLocaleString()}` : ''} accounts…`
    : null;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Email Tags</span>
          {tags.length > 0 && <span className="pill">{tags.length} tags</span>}
        </div>
        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onRefresh} disabled={loading}>
          {loading ? <span className="spinner" /> : <RefreshIcon />}
        </button>
      </div>

      {/* Load progress */}
      {loading && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{progressLabel}</div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--panel-3)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: pct !== null ? `${pct}%` : '40%',
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width 0.3s',
              animation: pct === null ? 'pulse 1.2s ease-in-out infinite' : undefined,
            }} />
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <input className="input" placeholder="Search tags…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && tags.length === 0 ? (
          <div className="empty-state"><span className="spinner" style={{ width: 20, height: 20 }} /><span>{progressLabel ?? 'Loading tags…'}</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 22, opacity: 0.3 }}>◈</span>
            <span>{search ? 'No matches' : 'No tags found'}</span>
            {!search && <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={onRefresh}>Load tags</button>}
          </div>
        ) : (
          filtered.map(tag => {
            const isSelected = selectedTag === tag.name;
            const { health } = tag;
            const activeRate = health.total > 0 ? Math.round((health.active / health.total) * 100) : 0;

            return (
              <div
                key={tag.name}
                className={`row-item${isSelected ? ' selected-tag' : ''}`}
                onClick={() => onSelect(tag.name)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: isSelected ? 'var(--success)' : 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tag.name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <span className="mono" style={{ color: 'var(--text-2)' }}>{health.total}</span> total
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>·</span>
                    <span style={{ fontSize: 11, color: 'var(--success)' }}>
                      <span className="mono">{health.active}</span> active
                    </span>
                    {health.disconnected > 0 && (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--danger)' }}>
                          <span className="mono">{health.disconnected}</span> disconnected
                        </span>
                      </>
                    )}
                    {health.unknown > 0 && (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          <span className="mono">{health.unknown}</span> unknown
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Health bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--panel-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${activeRate}%`,
                      background: activeRate > 80 ? 'var(--success)' : activeRate > 50 ? 'var(--warning)' : 'var(--danger)',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{activeRate}%</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
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
