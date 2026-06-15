export interface Campaign {
  id: number;
  name: string;
  status: string;
  sender_count?: number;
  tags?: string[];
  created_at?: string;
}

export interface ActionResult {
  campaign_id: number;
  campaign_name: string;
  status: 'success' | 'error';
  error?: string;
}

export interface EmailAccount {
  id: number;
  from_email: string;
  is_smtp_success?: boolean | null;
  is_imap_success?: boolean | null;
}

/** Flattened account returned by the chunked /api/tags/chunk endpoint. */
export interface FlatAccount {
  id: number;
  from_email: string;
  is_smtp_success: boolean | null;
  is_imap_success: boolean | null;
  tags: string[];
}

export interface AccountChunk {
  accounts: FlatAccount[];
  nextOffset: number | null; // null = no more data
  total: number | null;
  rateLimited: boolean;
  /** Seconds to wait before retrying when rateLimited is true. */
  retryAfter?: number;
}

export type AccountHealth = 'active' | 'disconnected' | 'unknown';

export function getAccountHealth(acc: EmailAccount): AccountHealth {
  if (acc.is_smtp_success == null || acc.is_imap_success == null) return 'unknown';
  if (acc.is_smtp_success === true && acc.is_imap_success === true) return 'active';
  return 'disconnected';
}

export interface TagHealthSummary {
  total: number;
  active: number;
  disconnected: number;
  unknown: number;
}

export interface TagGroup {
  name: string;
  accounts: EmailAccount[];
  count: number;
  health: TagHealthSummary;
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

export type SyncMode = 'replace' | 'add' | 'remove';

export interface SyncResult {
  campaign_id: number;
  campaign_name: string;
  status: 'success' | 'error';
  added: number;
  removed: number;
  error?: string;
}
