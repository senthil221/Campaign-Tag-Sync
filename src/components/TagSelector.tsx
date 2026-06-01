'use client';
import { useState, useMemo } from 'react';
import type { TagGroup } from '@/types';

interface Props {
  tags: TagGroup[];
  selectedTag: string | null;
  onSelect: (tagName: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

export default function TagSelector({ tags, selectedTag, onSelect, loading, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  const filtered = useMemo(() =>
    tags.filter(t => t.name.toLowerCase().includes(search.toLowerCase())),
    [tags, search]
  );

  const handleTagClick = (tagName: string) => {
    onSelect(tagName);
    setExpandedTag(prev => prev === tagName ? null : tagName);
  };

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="label" style={{ color: 'var(--green)' }}>Email Tags</span>
          <span className="stat-pill">{tags.length} tags</span>
          {selectedTag && (
            <span className="stat-pill" style={{ color: 'var(--green)', borderColor: 'var(--green)', background: 'var(--green-dim)' }}>
              ✓ {selectedTag}
            </span>
          )}
        </div>
        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={onRefresh} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '↻'}
        </button>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <input
          className="input"
          placeholder="Search tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 10px' }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && tags.length === 0 ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 20, height: 20 }} />
            <span>Loading tags...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 24 }}>◈</span>
            <span>{search ? 'No matches' : 'No tags found'}</span>
            {!search && <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={onRefresh}>Fetch tags</button>}
          </div>
        ) : (
          filtered.map(tag => {
            const isSelected = selectedTag === tag.name;
            const isExpanded = expandedTag === tag.name;
            return (
              <div key={tag.name}>
                <div
                  className={`row-item${isSelected ? ' selected-tag' : ''}`}
                  onClick={() => handleTagClick(tag.name)}
                >
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 12, color: isSelected ? 'var(--green)' : 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>
                      {tag.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="stat-pill">{tag.count} accts</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }} className="fade-in">
                    <div style={{ padding: '4px 16px 4px 32px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 0 4px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                        Accounts in this tag
                      </div>
                      {tag.accounts.slice(0, 50).map(acc => (
                        <div key={acc.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '3px 0', fontSize: 10, borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                          <span style={{ color: 'var(--green)', fontWeight: 600, minWidth: 48 }}>{acc.id}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.from_email}</span>
                        </div>
                      ))}
                      {tag.accounts.length > 50 && (
                        <div style={{ padding: '6px 0', fontSize: 10, color: 'var(--text-muted)' }}>
                          +{tag.accounts.length - 50} more...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
