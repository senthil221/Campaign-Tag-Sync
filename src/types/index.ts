export interface Campaign {
  id: number;
  name: string;
  status: string;
  sender_count?: number;
}

export interface EmailAccount {
  id: number;
  from_email: string;
}

export interface TagGroup {
  name: string;
  accounts: EmailAccount[];
  count: number;
}

export interface CampaignSyncPreview {
  campaign_id: number;
  campaign_name: string;
  current_ids: number[];
  desired_ids: number[];
  to_add: number[];
  to_remove: number[];
  error?: string;
}

export interface SyncMode {
  mode: 'replace' | 'add' | 'remove';
}

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SyncResult {
  campaign_id: number;
  campaign_name: string;
  status: 'success' | 'error';
  added: number;
  removed: number;
  error?: string;
}
