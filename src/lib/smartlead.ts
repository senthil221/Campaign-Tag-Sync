import { getAccountHealth } from '@/types';
import type { Campaign, EmailAccount, TagGroup } from '@/types';

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

export async function fetchAllEmailAccountsWithTags(): Promise<TagGroup[]> {
  const jwt = getJwt();
  const limit = 100;
  let offset = 0;
  let allAccounts: Array<{
    id: number;
    from_email: string;
    is_smtp_success?: boolean | null;
    is_imap_success?: boolean | null;
    email_account_tag_mappings: Array<{ tag?: { name?: string } }>;
  }> = [];
  let more = true;

  while (more) {
    const url = `${INTERNAL_BASE}/email-account/get-total-email-accounts?offset=${offset}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Authorization: jwt },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Failed to fetch email accounts: ${res.status} ${res.statusText} — ${body}`);
    }
    const json = await res.json();
    const accounts = json?.data?.email_accounts ?? json?.data ?? [];
    if (!accounts || accounts.length === 0) {
      more = false;
    } else {
      allAccounts = allAccounts.concat(Array.isArray(accounts) ? accounts : [accounts]);
      offset += limit;
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // Group by tag name
  const tagMap: Record<string, EmailAccount[]> = {};
  for (const acc of allAccounts) {
    const mappings = acc.email_account_tag_mappings ?? [];
    for (const m of mappings) {
      const tName = m.tag?.name;
      if (tName) {
        if (!tagMap[tName]) tagMap[tName] = [];
        tagMap[tName].push({
          id: acc.id,
          from_email: acc.from_email ?? 'unknown',
          is_smtp_success: acc.is_smtp_success ?? null,
          is_imap_success: acc.is_imap_success ?? null,
        });
      }
    }
  }

  return Object.keys(tagMap)
    .sort()
    .map(name => {
      const accounts = tagMap[name];
      const health = accounts.reduce(
        (acc, a) => {
          const h = getAccountHealth(a);
          acc[h]++;
          acc.total++;
          return acc;
        },
        { total: 0, active: 0, disconnected: 0, unknown: 0 }
      );
      return { name, accounts, count: accounts.length, health };
    });
}
