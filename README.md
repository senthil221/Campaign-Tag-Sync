# Sender Sync

Internal tool to sync Smartlead email senders to campaigns by tag, and run
campaign maintenance actions (reallocate mailboxes, reschedule failed leads).

Built with Next.js 16 (App Router) and deployed on Vercel.

## How tag loading works

Smartlead paginates email accounts 100 at a time. To handle large account sets
without re-fetching on every request:

- **In-memory cache (stale-while-revalidate):** the first `/api/tags` request
  fetches live, subsequent requests return instantly, and stale data refreshes
  in the background (10-minute TTL).
- **Gentle fetching:** pages are fetched with low concurrency and a small gap
  between batches, and a `429` triggers a wait (honoring `Retry-After`) so we
  stay under Smartlead's rate limit.
- **Manual refresh:** `POST /api/cache` forces an immediate refresh; `GET
  /api/cache` reports cache status (age, account/tag counts).

> The cache lives in the server process. On Vercel's serverless containers it
> persists only while a container stays warm, so the very first load after an
> idle period will fetch live again.

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`:

| Variable            | Purpose                              |
| ------------------- | ------------------------------------ |
| `SMARTLEAD_API_KEY` | Smartlead public API key             |
| `SMARTLEAD_JWT`     | JWT for Smartlead internal endpoints |

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
