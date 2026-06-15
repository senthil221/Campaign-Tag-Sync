# Sender Sync

Internal tool to sync Smartlead email senders to campaigns by tag, and run
campaign maintenance actions (reallocate mailboxes, reschedule failed leads).

Built with Next.js 16 (App Router) and deployed on Vercel.

## How tag loading works

Smartlead paginates email accounts 100 at a time and rate-limits to roughly 60
requests/minute. At 20k+ accounts that's 200+ pages — far too much to fetch in a
single serverless request without timing out or tripping a `429`. So loading is
driven from the **browser**, one page at a time:

- **Chunked endpoint:** `GET /api/tags/chunk?offset=N&limit=L` returns a single
  page of flattened accounts plus `nextOffset` / `total`. Each request is short
  and stays well under any serverless timeout. On a `429` it returns
  `rateLimited: true` with the server's `Retry-After` instead of blocking.
- **Paced client loader** ([`src/lib/load-tags.ts`](src/lib/load-tags.ts)): the
  browser walks the offsets at a steady ~50 req/min, backs off when the API
  reports a rate limit, reports progress, then groups accounts by tag. The full
  20k load takes a few minutes the first time, with a live progress bar.
- **localStorage cache (10-min TTL):** the assembled dataset is cached in the
  browser, so revisits render instantly and only the manual refresh re-fetches.

> No server-side cache, cron, or external store — the work happens client-side
> and persists in the user's browser, so it behaves the same on any Vercel
> instance.

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`:

| Variable                          | Purpose                                                     |
| --------------------------------- | ---------------------------------------------------------- |
| `SMARTLEAD_API_KEY`               | Smartlead public API key                                   |
| `SMARTLEAD_JWT`                   | JWT for Smartlead internal endpoints                       |
| `NEXT_PUBLIC_SMARTLEAD_PAGE_SIZE` | _(optional)_ accounts per page; default `100` (max `500`)  |
| `NEXT_PUBLIC_FETCH_INTERVAL_MS`   | _(optional)_ gap between page requests; default `1200` (ms) |

> If your account tolerates a larger page size, bumping
> `NEXT_PUBLIC_SMARTLEAD_PAGE_SIZE` cuts the request count proportionally
> (e.g. `500` → ~5× fewer requests, ~5× faster). Lower
> `NEXT_PUBLIC_FETCH_INTERVAL_MS` to go faster at the risk of more `429`s.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
