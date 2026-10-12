# AltiusNxt — Website & AI Readiness Report

The AltiusNxt marketing site and the backend that generates the free **AI Readiness Report**:
a visitor pastes one product page URL, and the pipeline runs the same playbook an analyst runs
by hand — live buyer queries on ChatGPT, Claude and Gemini, a competitor price benchmark, a
page-gap audit, a before/after mock-up — and returns a six-page outreach PDF.

```
.
├── src/                 React 19 + Vite site (pages, components, assets, styles)
├── public/              static files
├── index.html, vite.config.js
└── server/              Node 20+ / Express API
    ├── src/
    │   ├── index.js             app bootstrap, routes mount, trust-proxy
    │   ├── config.js            env → config (all providers optional, degrade gracefully)
    │   ├── routes/              /api/quick-scan, /api/leads (+ /api/leads/:jobId), /api/reports, /api/outreach
    │   ├── services/            the report pipeline (see below)
    │   └── templates/           HTML templates rendered to PDF
    ├── scripts/             run / render / smoke-test scripts
    ├── assets/              logo, certification badges embedded in the PDF
    └── .env.example         every configuration key, blank
```

## Running locally

Requires Node 20+. Two processes: the Vite dev server (site) and the API.

```bash
# 1. API
cd server
npm install
npx playwright install chromium          # page screenshots + PDF rendering
cp .env.example .env                     # then fill in the keys (see below)
npm run dev                              # http://localhost:8787

# 2. Site (new terminal, repo root)
npm install
npm run dev                              # http://localhost:5173 — /api/* is proxied to :8787
```

Production build of the site: `npm run build` → `dist/`. Point `VITE_API_URL` at the API host if it
isn't served behind the same origin.

### Configuration (`server/.env`)

| Key | Needed for |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Quick scan, query generation, synthesis, gap writing — **required** |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Live ChatGPT web-search queries |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Live Claude web-search queries |
| `SCRAPE_DO_TOKEN` | JS-rendered page fetch (falls back to a direct fetch) |
| `GOOGLE_PLACES_API_KEY` | Prospect address, Google rating/review count |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `LEAD_NOTIFY_EMAIL` | Emailing the PDF to the lead and the sales inbox |
| `OUTREACH_API_TOKEN` | Internal `/api/outreach/generate` endpoint |
| `MISTRAL_API_KEY` | OCR of PDF datasheets / spec diagrams linked from the page |
| `BRIGHTDATA_*` | Legacy SERP check (unused when unset) |
| `PORT`, `CORS_ORIGIN` | Server |

Every provider is optional except Gemini; a missing key skips that step rather than failing the
report. **Never commit `.env`** — it is git-ignored.

## How a report is generated

`POST /api/leads` validates the form, returns `202 {jobId}` immediately, and runs the pipeline in
the background; the site polls `GET /api/leads/:jobId` (status, stage, elapsed) until `done` or
`failed`. Failures come back as `200 {status:"failed", error}` on purpose: proxies and CDNs replace
origin 5xx bodies with their own error page, which would hide the reason from the visitor.

The pipeline (`server/src/services/outreachPipeline.js`), in order:

1. **Identity** — fetch the page, extract product name / brand / code / attributes (`gemini.js`).
   A code that is only the seller's URL slug or JSON-LD `sku` on a page naming no manufacturer is
   treated as the seller's stock number, not a manufacturer part number.
2. **Price** — JSON-LD / meta price first, text scan second (`competitorBenchmark.js`), so a
   struck-through MSRP is never mistaken for the selling price.
3. **Store identity** — if the typed company doesn't match the page's domain / `og:site_name`,
   the report is about the store that owns the page.
4. **Buyer queries** — 5 that name the product, 3 category searches; each run live on every
   configured engine; cited sellers and the prospect's citation are extracted per query.
5. **Cross-engine research** (`crossEngineResearch.js`) — one open research prompt per engine
   (real manufacturer + MPN, other sellers with prices and stock, review of the page), then one
   synthesis pass that merges them and flags contradictions against the page's ground truth.
6. **Competitor benchmark** — in-stock dealers only, marketplaces (eBay/Amazon) and the prospect
   itself excluded, names deduped ("PGN" = "PGN Bearings"), outliers dropped.
7. **Gaps** — deterministic rules fire on measured evidence (site notice banner, missing spec
   table, naming inconsistency, URL-encoded structured data, missing MPN / manufacturer not
   stated, title & breadcrumb duplication …); Gemini only phrases the ones that fired. Max five.
8. **Crawler access** (`crawlerAccess.js`), **scorecard** (`scorecard.js`), **screenshots and
   enriched mock-up** (`pageScreenshots.js`), **revenue-at-stake** tiers scaled to the price point.
9. **PDF** — `templates/outreachReportTemplate.js` rendered with headless Chromium
   (`reportPdf.js`), emailed via `mailer.js` when SMTP is configured.

## Useful scripts (`server/scripts`)

```bash
node scripts/run-mts.mjs <product-url> "<Company>"   # full pipeline → outreach-<Company>-v2.pdf + -data.json
node scripts/render-mts.mjs                           # re-render the PDF from saved data (template work)
node scripts/debug-epco-research.mjs                  # cross-engine research + synthesis only
node scripts/debug-spec.mjs <saved.html>              # which spec fields the counter matches on a page
```

## Site pages

`/` and `/how-it-works` (home design) · `/about-us` · `/workbench` (Product Data Cleansing Guide)
· `/why-altiusnxt` · `/resources` (blogs, case studies, events, FAQs) · `/ai-readiness-report`
· `/privacy-policy` · `/terms`. Styling lives in `src/index.css`; shared layout in
`src/components/Header.jsx` and `Footer.jsx`.
