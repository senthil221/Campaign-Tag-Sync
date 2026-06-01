'use client';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import CampaignSelector from '@/components/CampaignSelector';
import TagSelector from '@/components/TagSelector';
import SyncPanel from '@/components/SyncPanel';
import PreviewModal from '@/components/PreviewModal';
import type { Campaign, TagGroup, CampaignSyncPreview, SyncResult } from '@/types';

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tags, setTags] = useState<TagGroup[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<number>>(new Set());
  const [selectedTagName, setSelectedTagName] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'replace' | 'add' | 'remove'>('replace');

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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAllCampaigns = useCallback(() => {
    setSelectedCampaignIds(new Set(campaigns.map(c => c.id)));
  }, [campaigns]);

  const clearCampaigns = useCallback(() => {
    setSelectedCampaignIds(new Set());
  }, []);

  const handlePreview = useCallback(async () => {
    const selectedTag = tags.find(t => t.name === selectedTagName);
    if (!selectedTag || selectedCampaignIds.size === 0) return;

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
          tag_account_ids: selectedTag.accounts.map(a => a.id),
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
  }, [tags, selectedTagName, selectedCampaignIds, campaigns, syncMode]);

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
      if (failed > 0) {
        toast.error(`Sync completed: ${success} ok, ${failed} failed`);
      } else {
        toast.success(`Sync complete! ${success} campaigns updated`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setExecuting(false);
    }
  }, [previews]);

  const selectedTag = tags.find(t => t.name === selectedTagName) ?? null;
  const selectedCampaigns = campaigns.filter(c => selectedCampaignIds.has(c.id));

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '0.04em', color: 'var(--text)', margin: 0 }}>
            SMARTLEAD
          </h1>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--accent)', letterSpacing: '0.08em' }}>
            SENDER SYNC
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>INTERNAL TOOL</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', display: 'inline-block' }} />
        </div>
      </header>

      {/* Main content — fills remaining viewport height, nothing overflows */}
      <main style={{ flex: 1, padding: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden' }}>
        {/* Panels row — takes all available space above sync panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <CampaignSelector
            campaigns={campaigns}
            selectedIds={selectedCampaignIds}
            onToggle={toggleCampaign}
            onSelectAll={selectAllCampaigns}
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

        {/* Sync action panel — fixed height at bottom, never overlaps */}
        <div style={{ flexShrink: 0 }}>
          <SyncPanel
            selectedCampaigns={selectedCampaigns}
            selectedTag={selectedTag}
            syncMode={syncMode}
            onModeChange={setSyncMode}
            onPreview={handlePreview}
            previewLoading={previewLoading}
          />
        </div>
      </main>

      {/* Footer */}
      <footer style={{ flexShrink: 0, padding: '8px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Click ↻ in each panel to load data</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Select campaigns + tag → Preview → Confirm</span>
      </footer>

      {/* Preview Modal */}
      {previews && (
        <PreviewModal
          previews={previews}
          syncMode={syncMode}
          tagName={selectedTagName ?? ''}
          onConfirm={handleExecuteSync}
          onCancel={() => { setPreviews(null); setSyncResults(null); }}
          executing={executing}
          results={syncResults}
        />
      )}
    </div>
  );
}
