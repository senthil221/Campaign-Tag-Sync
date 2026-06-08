# Sender Sync

Internal tool to sync Smartlead email senders to campaigns by tag, and run
campaign maintenance actions (reallocate mailboxes, reschedule failed leads).

Built with Next.js 16 (App Router) and deployed on Vercel.

## How it scales to 20k+ accounts

Smartlead paginates email accounts 100 at a time. Fetching 20k accounts live on
every request takes ~30s and times out (504) on Vercel. To make this seamless:

- **Persistent store (Upstash Redis):** the full tag/account dataset is stored
  gzipped in Redis. User requests (`/api/tags`) read it in milliseconds.
- **Background refresh (Vercel Cron):** `/api/cron/refresh-tags` runs every
  10 minutes (see [`vercel.json`](vercel.json)), re-fetches from Smartlead with
  bounded concurrency + 429 retry/backoff, and updates Redis.
- **Graceful fallback:** if Redis env vars are absent (e.g. local dev), the app
  uses an in-memory stale-while-revalidate cache instead.
- **Manual refresh:** `POST /api/cache` forces an immediate refresh; `GET
  /api/cache` reports store status (backend, age, account/tag counts).

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in:

| Variable                   | Required | Purpose                                              |
| -------------------------- | -------- | ---------------------------------------------------- |
| `SMARTLEAD_API_KEY`        | yes      | Smartlead public API key                             |
| `SMARTLEAD_JWT`            | yes      | JWT for Smartlead internal endpoints                 |
| `UPSTASH_REDIS_REST_URL`   | prod     | Upstash Redis REST URL (persistent store)            |
| `UPSTASH_REDIS_REST_TOKEN` | prod     | Upstash Redis REST token                             |
| `CRON_SECRET`              | prod     | Secret Vercel Cron sends to authorize the refresh    |

### Setting up Upstash Redis (one time)

1. Create a free database at [console.upstash.com](https://console.upstash.com).
2. Copy the **REST API** URL and token into the two `UPSTASH_*` env vars
   (in `.env.local` locally, and in Vercel → Project → Settings → Environment
   Variables for production).
3. Set `CRON_SECRET` to a long random string in Vercel too.
4. Redeploy. Vercel registers the cron from `vercel.json` automatically.

> **Vercel plan note:** the `*/10 * * * *` cron requires the Pro plan. On Hobby,
> crons run at most once per day — change the schedule in `vercel.json`
> accordingly, or rely on the manual `POST /api/cache` refresh. Either way, once
> the store is populated it persists in Redis, so reads stay fast.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Upstash configured,
the first tag load fetches live (slower) and is then cached in memory.
