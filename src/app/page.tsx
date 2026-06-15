'use client';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import CampaignSelector from '@/components/CampaignSelector';
import TagSelector from '@/components/TagSelector';
import SyncPanel from '@/components/SyncPanel';
import PreviewModal from '@/components/PreviewModal';
import CampaignActionsPanel from '@/components/CampaignActionsPanel';
import { getAccountHealth } from '@/types';
import { fetchJson } from '@/lib/fetch-json';
import { loadAllTags, readCachedTags, type LoadProgress } from '@/lib/load-tags';
import type { Campaign, TagGroup, CampaignSyncPreview, SyncResult, ActionResult } from '@/types';

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tags, setTags] = useState<TagGroup[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<number>>(new Set());
  const [selectedTagName, setSelectedTagName] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'replace' | 'add' | 'remove'>('replace');
  const [useOnlyActive, setUseOnlyActive] = useState(true);

  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsProgress, setTagsProgress] = useState<LoadProgress | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const tagsAbort = useRef<AbortController | null>(null);

  const [previews, setPreviews] = useState<CampaignSyncPreview[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const data = await fetchJson<{ campaigns: Campaign[] }>('/api/campaigns');
      setCampaigns(data.campaigns);
      toast.success(`Loaded ${data.campaigns.length} campaigns`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  // Hydrate tags from the last cached load, if any. This must run after mount
  // (not as lazy initial state) because the page is statically prerendered with
  // no localStorage — reading it during render would cause a hydration mismatch.
  useEffect(() => {
    const cached = readCachedTags();
    if (!cached) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time hydration from localStorage on mount
    setTags(cached.tags);
    if (cached.stale) {
      toast('Showing cached tags — click refresh to update', { duration: 4000 });
    }
  }, []);

  const fetchTags = useCallback(async () => {
    tagsAbort.current?.abort();
    const controller = new AbortController();
    tagsAbort.current = controller;

    setTagsLoading(true);
    setTagsProgress({ loaded: 0, total: null });
    try {
      const tags = await loadAllTags({
        signal: controller.signal,
        onProgress: setTagsProgress,
      });
      setTags(tags);
      toast.success(`Loaded ${tags.length} email tags`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error(err instanceof Error ? err.message : 'Failed to fetch tags');
    } finally {
      if (tagsAbort.current === controller) tagsAbort.current = null;
      setTagsLoading(false);
      setTagsProgress(null);
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

      const data = await fetchJson<{ previews: CampaignSyncPreview[] }>('/api/preview-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_ids: Array.from(selectedCampaignIds),
          campaign_names: campaignNameMap,
          tag_account_ids: activeAccountIds,
          mode: syncMode,
        }),
      });
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
      const data = await fetchJson<{ results: SyncResult[] }>('/api/execute-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previews }),
      });
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

  const handleReallocate = useCallback(async (ids: number[], nameMap: Record<number, string>): Promise<ActionResult[]> => {
    const data = await fetchJson<{ results: ActionResult[] }>('/api/reallocate-mailboxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_ids: ids, campaign_names: nameMap }),
    });
    const ok = data.results.filter((r: ActionResult) => r.status === 'success').length;
    const fail = data.results.filter((r: ActionResult) => r.status === 'error').length;
    if (fail > 0) toast.error(`Reallocate: ${ok} done · ${fail} failed`);
    else toast.success(`Reallocated mailboxes for ${ok} campaign${ok !== 1 ? 's' : ''}`);
    return data.results;
  }, []);

  const handleReschedule = useCallback(async (ids: number[], nameMap: Record<number, string>): Promise<ActionResult[]> => {
    const data = await fetchJson<{ results: ActionResult[] }>('/api/reschedule-failed-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_ids: ids, campaign_names: nameMap }),
    });
    const ok = data.results.filter((r: ActionResult) => r.status === 'success').length;
    const fail = data.results.filter((r: ActionResult) => r.status === 'error').length;
    if (fail > 0) toast.error(`Reschedule: ${ok} done · ${fail} failed`);
    else toast.success(`Rescheduled failed leads for ${ok} campaign${ok !== 1 ? 's' : ''}`);
    return data.results;
  }, []);

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
            progress={tagsProgress}
            onRefresh={fetchTags}
          />
        </div>

        {/* Bottom row: Sync Panel + Actions Panel */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 12, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
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
          <CampaignActionsPanel
            selectedCampaigns={selectedCampaigns}
            onReallocate={handleReallocate}
            onReschedule={handleReschedule}
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
