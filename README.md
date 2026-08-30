# Acquisition Readiness Queue

An explainable lead-prioritization workspace built as a focused extension to [SaaSquatch Leads](https://www.saasquatchleads.com/). It turns a raw company list into a ranked acquisition/outreach queue that shows **who to contact, why they rank, what data is missing, and what to say on the first touch**.

> Built as a five-hour full-stack product exercise (Quality First). All company and contact records are fictional demo data. This project does not scrape the live web.

## Why this feature

SaaSquatch already covers discovery, filtering, enrichment, revenue estimates, AI scoring, export, and (on higher plans) AI email generation. After a list is enriched, the expensive bottleneck is still human: a searcher or SDR has a few hours of owner conversations, not a few thousand.

The Acquisition Readiness Queue is the decision layer after enrichment. It is intentionally explainable. Scores are not a black box. Operators can change the ICP, see the exact factor breakdown, keep a small working queue separate from the raw universe, and leave with a call list plus a first-touch draft.

That maps to how Caprae actually sells Search-as-a-Service: not more raw leads, but more *defensible* owner meetings per week.

## What it does

- Imports a CSV of company leads, **merges on website**, and persists records in SQLite without wiping queue membership.
- Splits **discovery** (the full universe) from a deliberate **readiness queue**.
- Scores every lead against a live ICP, including near-band size, owner-title quality, email format, staleness, and duplicate domains.
- Recommends a next step: **Ready to contact**, **Research first**, **Enrich first**, or **Deprioritize**.
- Drafts a first-touch email and talking points from the score, not a generic template dump.
- Copies a daily call brief and exports either a working CSV or a HubSpot-style contact file.
- Remembers the ICP in the browser and reloads persisted leads from the API.

## Product flow

```text
CSV import (merge on website) → SQLite → ICP scoring
        ↓
discovery universe  →  add / remove  →  working queue
        ↓
explanations, quality flags, recommended action, first-touch draft
        ↓
daily brief / CSV / CRM export
```

## Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web client | React 19, TypeScript, Vite | Fast analyst workspace |
| API | Node.js, Express 5 | REST persistence for leads and queue membership |
| Database | SQLite via `better-sqlite3`, WAL mode | Single-node MVP storage |
| CSV | Papa Parse | RFC 4180 import/export, including quoted locations |
| Scoring / drafts | Deterministic TypeScript | Explainable ranking and outreach copy |
| Tests | `node:test` via `tsx` | Scoring and import-merge coverage |
| UI | CSS, Lucide | Light, product-looking interface without a component library |

## Architecture

```text
React + Vite client  (:5173)
   │  GET /api/leads
   │  POST /api/leads/import
   │  PATCH /api/leads/:id/queue
   ▼
Express API (:8787)
   ▼
SQLite (data/queue.db)
```

Vite proxies `/api` to Express in development. Scoring and outreach drafts stay on the client so ICP edits feel instant. Persistence is the source of truth for the list and for who is in the working queue.

### API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness and database check |
| `GET` | `/api/leads` | Stored leads, with `inQueue` coerced to boolean |
| `POST` | `/api/leads/import` | Upserts `{ "leads": [...] }` in a transaction |
| `PATCH` | `/api/leads/:id/queue` | Sets queue membership for one record |
| `DELETE` | `/api/leads` | Clears stored leads |

See [docs/API.md](docs/API.md) for a curl walkthrough.

## Scoring model

Default ICP: U.S. commercial, healthcare, and business-services companies, $2M–$15M revenue, 15–125 employees.

| Signal | Weight | Purpose |
| --- | ---: | --- |
| Industry match | 25 | Thesis fit |
| Revenue range | 25 | Deal-size band (half credit if within 20% of the band) |
| Geography | 15 | Target market |
| Employee range | 15 | Second size proxy (same near-band rule) |
| Decision-maker | 10 | Reachable contact; full points only for owner-level titles |
| Profile completeness | 10 | Enough fields to personalize |

Penalties: duplicate domain −20, profile older than 90 days −5. Invalid emails do not count as a contact route. The UI never hides the arithmetic.

## Local setup

Prerequisites: Node.js 20+ and npm.

```bash
git clone https://github.com/abhishekabhi123/saasquatch-acquisition-readiness-queue.git
cd saasquatch-acquisition-readiness-queue
npm install
npm run seed
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). `npm run dev` starts the client and the API together.

```bash
npm test       # scoring + CSV merge tests
npm run build  # type-check and production client
npm run start  # API only, http://localhost:8787
npm run seed   # load the fictional demo set into SQLite
```

Reset local data by deleting `data/queue.db` while the API is stopped, then `npm run seed`.

## CSV format

Use [demo-leads.csv](./demo-leads.csv) as the template:

```text
company,website,industry,location,revenue,employees,contactName,contactTitle,email,phone,lastUpdated
```

Quoted fields are supported. Matching websites update the existing record and **keep** queue membership. New websites are appended and left out of the queue until someone adds them.

## Performance, caching, and data strategy

- `useMemo` recomputes scores only when leads or the ICP change.
- SQLite WAL is appropriate for this single-node demo.
- ICP lives in `localStorage` so a refresh does not reset the buy box.
- Production would move scoring behind a job, cache `importVersion + icpHash` in Redis, and store leads in managed PostgreSQL.

## Deployment plan

1. Static React bundle on Vercel or Cloudflare Pages.
2. Express on Render, Railway, Fly.io, AWS ECS, or Cloud Run.
3. Managed Postgres (Neon / RDS / Cloud SQL); secrets in the provider’s secret manager.
4. Point `VITE_API_BASE_URL` at the API. The Vite proxy covers local development only.
5. Add auth, rate limits, Sentry, structured logs, and backups before multi-user use.

The client is static. The API is serverful. They scale independently.

## Data ethics

This submission does **not** scrape sites, rotate IPs, solve CAPTCHAs, or bypass access controls. Production enrichment should use licensed providers or customer-authorized CRM data, with provenance, retention, and opt-out handling.

## Known MVP tradeoffs

- No authentication or multi-tenant workspaces.
- Outreach copy is deterministic, not a hosted LLM, so every draft is inspectable.
- SQLite is not a multi-region production database.
- No live enrichment vendor.

## Two-minute walkthrough

Use [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md). Handbook written answers are in [docs/HANDBOOK.md](docs/HANDBOOK.md). The email packet is in [docs/EMAIL_DRAFT.md](docs/EMAIL_DRAFT.md).

## Repository

https://github.com/abhishekabhi123/saasquatch-acquisition-readiness-queue
