import type { AccountChunk, Campaign, EmailAccount, FlatAccount } from '@/types';

const API_BASE = 'https://server.smartlead.ai/api/v1';
const INTERNAL_BASE = 'https://server.smartlead.ai/api';

function getApiKey(): string {
  const key = process.env.SMARTLEAD_API_KEY;
  if (!key) throw new Error('SMARTLEAD_API_KEY is not set in environment variables');
  return key;
}

function getJwt(): string {
  const jwt = process.env.SMARTLEAD_JWT;
  if (!jwt) throw new Error('SMARTLEAD_JWT is not set in environment variables');
  return jwt.startsWith('Bearer ') ? jwt : `Bearer ${jwt}`;
}


function extractCampaignTags(c: Record<string, unknown>): string[] {
  // Smartlead returns tags as: [{ tag_id, tag_name, tag_color }]
  const raw = (c.tags as Array<{ tag_name?: string; name?: string } | string> | undefined) ?? [];
  return raw
    .map(t => (typeof t === 'string' ? t : (t?.tag_name ?? t?.name)))
    .filter((n): n is string => !!n);
}

export async function fetchAllCampaigns(): Promise<Campaign[]> {
  const apiKey = getApiKey();
  const url = `${API_BASE}/campaigns?api_key=${apiKey}&include_tags=true`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const raw: Array<Record<string, unknown>> = Array.isArray(json) ? json : json?.data ?? [];
  return raw.map(c => ({
    id:         c.id         as number,
    name:       c.name       as string,
    status:     (c.status    as string) ?? 'UNKNOWN',
    tags:       extractCampaignTags(c),
    created_at: (c.created_at as string) ?? undefined,
  }));
}

export async function fetchCampaignEmailAccounts(campaignId: number): Promise<EmailAccount[]> {
  const apiKey = getApiKey();
  const url = `${API_BASE}/campaigns/${campaignId}/email-accounts?api_key=${apiKey}&include_tags=true`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch senders for campaign ${campaignId}: ${res.status}`);
  const json = await res.json();
  const raw: Array<{ id: number; from_email: string }> = Array.isArray(json) ? json : json?.data ?? [];
  return raw.map(a => ({ id: a.id, from_email: a.from_email }));
}

export async function addSendersToCampaign(campaignId: number, emailAccountIds: number[]): Promise<void> {
  if (emailAccountIds.length === 0) return;
  const apiKey = getApiKey();
  const url = `${API_BASE}/campaigns/${campaignId}/email-accounts?api_key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_account_ids: emailAccountIds }),
  });
  if (!res.ok) throw new Error(`Failed to add senders to campaign ${campaignId}: ${res.status}`);
}

export async function removeSendersFromCampaign(campaignId: number, emailAccountIds: number[]): Promise<void> {
  if (emailAccountIds.length === 0) return;
  const apiKey = getApiKey();
  const url = `${API_BASE}/campaigns/${campaignId}/email-accounts?api_key=${apiKey}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_account_ids: emailAccountIds }),
  });
  if (!res.ok) throw new Error(`Failed to remove senders from campaign ${campaignId}: ${res.status}`);
}

export async function reallocateMailboxes(campaignId: number): Promise<unknown> {
  const apiKey = getApiKey();
  const jwt = getJwt();
  const url = `${INTERNAL_BASE}/email-campaigns/${campaignId}/reallocate-mailboxes?api_key=${apiKey}`;
  const res = await fetch(url, { headers: { Authorization: jwt }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Campaign ${campaignId}: ${res.status} ${res.statusText}`);
  return res.json().catch(() => null);
}

export async function rescheduleFailedLeads(campaignId: number): Promise<unknown> {
  const apiKey = getApiKey();
  const jwt = getJwt();
  const url = `${INTERNAL_BASE}/email-campaigns/${campaignId}/reschedule-failed-leads?api_key=${apiKey}`;
  const res = await fetch(url, { headers: { Authorization: jwt }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Campaign ${campaignId}: ${res.status} ${res.statusText}`);
  return res.json().catch(() => null);
}

type RawAccount = {
  id: number;
  from_email: string;
  is_smtp_success?: boolean | null;
  is_imap_success?: boolean | null;
  email_account_tag_mappings?: Array<{ tag?: { name?: string } }>;
};

function flattenAccount(a: RawAccount): FlatAccount {
  const tags = (a.email_account_tag_mappings ?? [])
    .map(m => m.tag?.name)
    .filter((n): n is string => !!n);
  return {
    id: a.id,
    from_email: a.from_email ?? 'unknown',
    is_smtp_success: a.is_smtp_success ?? null,
    is_imap_success: a.is_imap_success ?? null,
    tags,
  };
}

/**
 * Fetch a single page of email accounts. Designed for the chunked, client-
 * paced loader: it does NOT block-and-retry on a 429. Instead it reports
 * `rateLimited` (with the server's Retry-After) and lets the caller back off,
 * so each request stays short and well under any serverless timeout.
 */
export async function fetchAccountChunk(offset: number, limit: number): Promise<AccountChunk> {
  const jwt = getJwt();
  const url = `${INTERNAL_BASE}/email-account/get-total-email-accounts?offset=${offset}&limit=${limit}`;
  const res = await fetch(url, { headers: { Authorization: jwt }, cache: 'no-store' });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after'));
    return {
      accounts: [],
      nextOffset: offset, // retry the same offset after backing off
      total: null,
      rateLimited: true,
      retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60,
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to fetch email accounts at offset ${offset}: ${res.status} ${res.statusText} — ${body}`);
  }

  const json = await res.json();
  const raw: RawAccount[] = json?.data?.email_accounts ?? json?.data ?? [];
  const list = Array.isArray(raw) ? raw : [];
  const total: number | null = json?.data?.total_email_accounts ?? json?.total_email_accounts ?? null;
  const accounts = list.map(flattenAccount);

  // Decide whether more pages remain. A short page always means we're done;
  // otherwise advance by what the server actually returned, bounded by total.
  let nextOffset: number | null;
  if (list.length < limit) {
    nextOffset = null;
  } else if (total !== null) {
    const fetchedEnd = offset + list.length;
    nextOffset = fetchedEnd < total ? fetchedEnd : null;
  } else {
    nextOffset = offset + list.length;
  }

  return { accounts, nextOffset, total, rateLimited: false };
}
