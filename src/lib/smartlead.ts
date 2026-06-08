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

type RawAccount = {
  id: number;
  from_email: string;
  is_smtp_success?: boolean | null;
  is_imap_success?: boolean | null;
  email_account_tag_mappings: Array<{ tag?: { name?: string } }>;
};

async function fetchAccountPage(jwt: string, offset: number, limit: number): Promise<{ accounts: RawAccount[]; total: number | null }> {
  const url = `${INTERNAL_BASE}/email-account/get-total-email-accounts?offset=${offset}&limit=${limit}`;
  const res = await fetch(url, { headers: { Authorization: jwt }, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to fetch email accounts at offset ${offset}: ${res.status} ${res.statusText} — ${body}`);
  }
  const json = await res.json();
  const accounts: RawAccount[] = json?.data?.email_accounts ?? json?.data ?? [];
  const total: number | null = json?.data?.total_email_accounts ?? json?.total_email_accounts ?? null;
  return { accounts: Array.isArray(accounts) ? accounts : [], total };
}

function groupAccountsByTag(allAccounts: RawAccount[]): TagGroup[] {
  const tagMap: Record<string, EmailAccount[]> = {};
  for (const acc of allAccounts) {
    for (const m of acc.email_account_tag_mappings ?? []) {
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

export async function fetchAllEmailAccountsWithTags(): Promise<TagGroup[]> {
  const jwt = getJwt();
  const LIMIT = 100;
  const CONCURRENT = 10;

  // Fetch first page to get data and (hopefully) total count
  const { accounts: firstAccounts, total } = await fetchAccountPage(jwt, 0, LIMIT);
  const allAccounts: RawAccount[] = [...firstAccounts];

  if (firstAccounts.length === LIMIT) {
    let remainingOffsets: number[];

    if (total !== null && total > LIMIT) {
      remainingOffsets = [];
      for (let offset = LIMIT; offset < total; offset += LIMIT) {
        remainingOffsets.push(offset);
      }
    } else {
      // Total unknown — speculatively fetch up to 50k accounts
      remainingOffsets = [];
      for (let offset = LIMIT; offset <= 50000; offset += LIMIT) {
        remainingOffsets.push(offset);
      }
    }

    // Fetch remaining pages in parallel batches
    for (let i = 0; i < remainingOffsets.length; i += CONCURRENT) {
      const batch = remainingOffsets.slice(i, i + CONCURRENT);
      const results = await Promise.all(
        batch.map(offset => fetchAccountPage(jwt, offset, LIMIT))
      );

      let done = false;
      for (const { accounts } of results) {
        if (accounts.length === 0) { done = true; break; }
        allAccounts.push(...accounts);
      }
      if (done) break;
    }
  }

  return groupAccountsByTag(allAccounts);
}
