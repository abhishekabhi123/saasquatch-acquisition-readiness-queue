# Acquisition Readiness Queue

An explainable lead-prioritization workspace built as a focused extension to SaaSquatch Leads. It turns a raw company list into a ranked acquisition/outreach queue, showing **who to contact, why they rank, what data is missing, and what action to take next**.

> Built as a five-hour full-stack product exercise. All included company and contact records are fictional demo data.

## Why this feature

SaaSquatch already addresses discovery, filtering, enrichment, revenue estimates, AI scoring, and export. The costly bottleneck that remains is the human decision: *which leads should receive limited research and outreach capacity first?*

The Acquisition Readiness Queue adds that decision layer. Rather than exposing a black-box score, it provides an adjustable ICP and an exact score breakdown for every record. That gives a searcher or sales operator a defensible daily call list and reduces time spent on leads that are duplicate, out of profile, or missing a viable contact route.

## What it does

- Imports a CSV of company leads and persists the imported records in SQLite.
- Scores every lead against a target acquisition profile (ICP).
- Explains the score by industry, revenue, geography, team size, contact availability, and data quality.
- Detects duplicate websites and flags missing contact/profile fields.
- Recommends a next step: **Ready to contact**, **Research first**, **Enrich first**, or **Deprioritize**.
- Supports searching, status filtering, lead-detail review, and CSV export.
- Loads persisted leads through a REST API when the workspace opens.

## Product flow

```text
CSV import → SQLite persistence → ICP scoring → prioritized queue
                                      ↓
                       explanations, quality flags, recommended action
                                      ↓
                             review / filter / export for outreach
```

## Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web client | React, TypeScript, Vite | Fast, responsive analyst workspace |
| API | Node.js, Express | REST endpoints for persisted lead records |
| Database | SQLite via `better-sqlite3` | Lightweight local persistence for the MVP |
| Data quality | Deterministic TypeScript rules | Explainable scoring and domain deduplication |
| UI | CSS, Lucide icons | Accessible, dependency-light product UI |

## Architecture

```text
React + Vite client
   │  GET /api/leads, POST /api/leads/import
   ▼
Express API (port 8787)
   ▼
SQLite database (data/queue.db)
```

The Vite development server proxies `/api` requests to Express, so the client never needs a hard-coded local API URL. The SQLite database enables WAL mode for improved read/write concurrency on a single-node deployment.

### API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness and database check |
| `GET` | `/api/leads` | Returns stored leads |
| `POST` | `/api/leads/import` | Upserts `{ "leads": [...] }` into SQLite |
| `DELETE` | `/api/leads` | Clears stored leads |

## Scoring model

The default ICP targets U.S. commercial, healthcare, and business-services companies with $2M–$15M revenue and 15–125 employees.

| Signal | Weight | Purpose |
| --- | ---: | --- |
| Industry match | 25 | Confirms the company matches the investment/outreach thesis |
| Revenue range | 25 | Keeps outreach in the intended deal-size band |
| Geography | 15 | Prioritizes the target market |
| Employee range | 15 | Adds a second size/operational proxy |
| Decision-maker route | 10 | Rewards records with a usable owner/contact channel |
| Profile completeness | 10 | Rewards information needed for personalization |

Duplicate domains receive a 20-point penalty and a visible flag. The UI never conceals the factors: reviewers can see exactly how a score was reached and adjust target industries live.

## Local setup

Prerequisites: Node.js 20+ and npm.

```bash
git clone https://github.com/abhishekabhi123/saasquatch-acquisition-readiness-queue.git
cd saasquatch-acquisition-readiness-queue
npm install
npm run seed
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The development command starts both the Vite client and the Express API.

Useful commands:

```bash
npm run build  # type-check and build the production client
npm run start  # start only the API at http://localhost:8787
npm run seed   # add two persistent demo records to SQLite
```

To reset local persisted data, delete `data/queue.db` while the API is stopped, then run `npm run seed`.

## CSV format

Use [demo-leads.csv](./demo-leads.csv) as the import template. The expected headers are:

```text
company,website,industry,location,revenue,employees,contactName,contactTitle,email,phone,lastUpdated
```

For the time-boxed MVP, the CSV parser expects simple comma-separated values. Production import should use a robust RFC 4180 parser, file-size limits, schema validation, and asynchronous import jobs.

## Performance, caching, and data strategy

- The client uses React `useMemo` to avoid recomputing scores unless the lead data or ICP changes.
- SQLite WAL mode improves concurrent local API access and is appropriate for this single-node MVP.
- The API returns only lead records; scoring stays local, deterministic, and immediate for this small list size.
- A production version would move scoring to a job/API service and cache list/score results in Redis using an `importVersion + icpHash` key. Imports or ICP edits would invalidate that key.
- Production persistence should migrate to managed PostgreSQL (for example, Neon, RDS, or Cloud SQL) once multi-user access and larger lead lists are required. SQLite is the actual database used in this submission.

## Deployment plan

For a production-minded deployment:

1. Deploy the React/Vite static bundle to Vercel or Cloudflare Pages.
2. Deploy Express as a container/service on Render, Railway, Fly.io, AWS ECS, or GCP Cloud Run.
3. Replace local SQLite with managed PostgreSQL and store secrets in the cloud provider’s secret manager.
4. Point `VITE_API_BASE_URL` to the API URL (the current dev proxy handles local development).
5. Add Sentry, structured request logs, rate limiting, authentication, and automated backups.

The client is static; the persistence API is serverful. That separation allows each tier to scale independently.

## Data ethics and compliance

This project intentionally does **not** scrape websites, evade CAPTCHAs, rotate IPs, or bypass access controls. In production, enrichment should use licensed providers or customer-authorized CRM data, with source provenance, collection timestamps, opt-out handling, data-retention policies, and applicable privacy/marketing-law review.

## Known MVP tradeoffs

- No authentication or user/workspace separation.
- No live enrichment vendor integration; demo records are fictional.
- CSV parsing is intentionally lightweight for the timebox.
- SQLite is suitable for a single-node demo, not a horizontally scaled multi-user deployment.
- The default dashboard seed records are client-side so the UI remains useful before the API is seeded; persisted API records take precedence once available.

## Two-minute walkthrough

1. **Problem (0:00–0:20):** “SaaSquatch helps discover and enrich leads. This feature solves the next bottleneck: deciding which of those leads deserve limited outreach capacity first.”
2. **Import and quality (0:20–0:45):** Import `demo-leads.csv`; call out persistence, duplicate detection, and data-completeness checks.
3. **Prioritization (0:45–1:20):** Show the ranked table, filter `Ready to contact`, and open a lead to explain transparent scoring.
4. **Actionability (1:20–1:40):** Show recommended next actions and export the prioritized segment for an outreach/CRM workflow.
5. **Technical close (1:40–2:00):** Explain React/Vite, Express, SQLite/WAL, development proxy, `useMemo` caching, and the managed Postgres + Redis production path.

## Repository

https://github.com/abhishekabhi123/saasquatch-acquisition-readiness-queue
