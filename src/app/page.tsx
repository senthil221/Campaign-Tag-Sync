'use client';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import CampaignSelector from '@/components/CampaignSelector';
import TagSelector from '@/components/TagSelector';
import SyncPanel from '@/components/SyncPanel';
import PreviewModal from '@/components/PreviewModal';
import { getAccountHealth } from '@/types';
import type { Campaign, TagGroup, CampaignSyncPreview, SyncResult } from '@/types';

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tags, setTags] = useState<TagGroup[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<number>>(new Set());
  const [selectedTagName, setSelectedTagName] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'replace' | 'add' | 'remove'>('replace');
  const [useOnlyActive, setUseOnlyActive] = useState(true);

  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [previews, setPreviews] = useState<CampaignSyncPreview[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch campaigns');
      setCampaigns(data.campaigns);
      toast.success(`Loaded ${data.campaigns.length} campaigns`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    setTagsLoading(true);
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch tags');
      setTags(data.tags);
      toast.success(`Loaded ${data.tags.length} email tags`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch tags');
    } finally {
      setTagsLoading(false);
    }
  }, []);

  const toggleCampaign = useCallback((id: number) => {
    setSelectedCampaignIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectFilteredCampaigns = useCallback((ids: number[]) => {
    setSelectedCampaignIds(prev => {
      // If all filtered are already selected, deselect them; otherwise add them
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }, []);
  const clearCampaigns = useCallback(() => setSelectedCampaignIds(new Set()), []);

  const selectedTag = useMemo(() => tags.find(t => t.name === selectedTagName) ?? null, [tags, selectedTagName]);
  const selectedCampaigns = useMemo(() => campaigns.filter(c => selectedCampaignIds.has(c.id)), [campaigns, selectedCampaignIds]);

  // Resolve the account IDs to use based on toggle
  const activeAccountIds = useMemo(() => {
    if (!selectedTag) return [];
    if (!useOnlyActive) return selectedTag.accounts.map(a => a.id);
    return selectedTag.accounts.filter(a => getAccountHealth(a) === 'active').map(a => a.id);
  }, [selectedTag, useOnlyActive]);

  const handlePreview = useCallback(async () => {
    if (!selectedTag || selectedCampaignIds.size === 0) return;
    if (activeAccountIds.length === 0) {
      toast.error('No active accounts in selected tag. Disable "Use only active" to proceed.');
      return;
    }

    setPreviewLoading(true);
    try {
      const campaignNameMap: Record<number, string> = {};
      campaigns.forEach(c => { campaignNameMap[c.id] = c.name; });

      const res = await fetch('/api/preview-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_ids: Array.from(selectedCampaignIds),
          campaign_names: campaignNameMap,
          tag_account_ids: activeAccountIds,
          mode: syncMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Preview failed');
      setPreviews(data.previews);
      setSyncResults(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedTag, selectedCampaignIds, activeAccountIds, campaigns, syncMode]);

  const handleExecuteSync = useCallback(async () => {
    if (!previews) return;
    setExecuting(true);
    try {
      const res = await fetch('/api/execute-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previews }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setSyncResults(data.results);
      const success = data.results.filter((r: SyncResult) => r.status === 'success').length;
      const failed = data.results.filter((r: SyncResult) => r.status === 'error').length;
      if (failed > 0) toast.error(`${success} synced · ${failed} failed`);
      else toast.success(`${success} campaigns synced`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setExecuting(false);
    }
  }, [previews]);

  const tagTotal = selectedTag?.health.total ?? 0;
  const activeUsed = useOnlyActive ? (selectedTag?.health.active ?? 0) : tagTotal;
  const disconnectedSkipped = useOnlyActive ? (selectedTag?.health.disconnected ?? 0) : 0;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--panel)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SyncIcon />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>Sender Sync</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Smartlead · Internal Tool</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 6px var(--success)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Connected</span>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: '16px 24px 12px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        {/* Two-panel row */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0, overflow: 'hidden' }}>
          <CampaignSelector
            campaigns={campaigns}
            selectedIds={selectedCampaignIds}
            onToggle={toggleCampaign}
            onSelectFiltered={selectFilteredCampaigns}
            onClearAll={clearCampaigns}
            loading={campaignsLoading}
            onRefresh={fetchCampaigns}
          />
          <TagSelector
            tags={tags}
            selectedTag={selectedTagName}
            onSelect={setSelectedTagName}
            loading={tagsLoading}
            onRefresh={fetchTags}
          />
        </div>

        {/* Sync panel — fixed at bottom */}
        <div style={{ flexShrink: 0 }}>
          <SyncPanel
            selectedCampaigns={selectedCampaigns}
            selectedTag={selectedTag}
            syncMode={syncMode}
            onModeChange={setSyncMode}
            useOnlyActive={useOnlyActive}
            onToggleActive={() => setUseOnlyActive(v => !v)}
            onPreview={handlePreview}
            previewLoading={previewLoading}
          />
        </div>
      </main>

      {/* Preview / Confirm modal */}
      {previews && (
        <PreviewModal
          previews={previews}
          syncMode={syncMode}
          tagName={selectedTagName ?? ''}
          tagTotal={tagTotal}
          activeUsed={activeUsed}
          disconnectedSkipped={disconnectedSkipped}
          useOnlyActive={useOnlyActive}
          onConfirm={handleExecuteSync}
          onCancel={() => { setPreviews(null); setSyncResults(null); }}
          executing={executing}
          results={syncResults}
        />
      )}
    </div>
  );
}

function SyncIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12 2.5A5.5 5.5 0 1 0 13 7" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 2.5h2V4.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
