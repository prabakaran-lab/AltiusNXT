import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Private usage log for the owner's dashboard (see routes/admin.js). One line per finished job (product-page enrichment or
 * AI Readiness Report), appended to server/data/usage-events.jsonl. Nothing here is shown to visitors and nothing here can
 * change how a job runs: recording never throws, and a failed write is only logged.
 */

const DIR = process.env.USAGE_DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data')
const FILE = path.join(DIR, 'usage-events.jsonl')

const cut = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

/** A short, readable reason for a failed job, so the dashboard can group failures. */
export function failureReason(message) {
  const m = String(message || '')
  if (/blocks automated|bot|security check|captcha/i.test(m)) return 'Page blocked by bot protection'
  if (/could not be read|could not be loaded|ENOTFOUND|timed? ?out|aborted/i.test(m)) return 'Page could not be read'
  if (/not enough verifiable|not enough product/i.test(m)) return 'Not enough product data on the page'
  if (/single product|homepage|category page|listing/i.test(m)) return 'Not a single product page'
  if (/credit balance|usage limit|quota|billing|insufficient|429|rate limit/i.test(m)) return 'AI credit or rate-limit problem'
  if (/email/i.test(m)) return 'Email problem'
  return 'Other'
}

/** Adds one finished job to the log. Never throws. */
export function recordUsage(event) {
  try {
    const e = {
      ts: new Date().toISOString(),
      type: event.type === 'report' ? 'report' : 'enrich',
      status: event.status === 'failed' ? 'failed' : 'done',
      secs: Number.isFinite(event.secs) ? Math.round(event.secs) : null,
      url: cut(event.url, 300),
      host: (() => { try { return new URL(event.url).hostname.replace(/^www\./, '') } catch { return '' } })(),
      company: cut(event.company, 120),
      name: cut(event.name, 120),
      email: cut(event.email, 160),
    }
    if (e.type === 'enrich' && e.status === 'done') {
      e.attrs = event.attrs ?? null
      e.technical = event.technical ?? null
      e.image = Boolean(event.image)
      e.taxonomy = Boolean(event.taxonomy)
    }
    if (e.type === 'report' && e.status === 'done') e.emailStatus = cut(event.emailStatus, 20)
    if (e.status === 'failed') { e.reason = failureReason(event.error); e.error = cut(event.error, 200) }
    fs.mkdirSync(DIR, { recursive: true })
    fs.appendFile(FILE, `${JSON.stringify(e)}\n`, (err) => { if (err) console.warn(`[usage] could not record: ${err.message}`) })
  } catch (err) {
    console.warn(`[usage] could not record: ${err.message}`)
  }
}

function readEvents() {
  let text = ''
  try { text = fs.readFileSync(FILE, 'utf8') } catch { return [] }
  const out = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try { out.push(JSON.parse(line)) } catch { /* skip a damaged line */ }
  }
  return out
}

const dayKey = (date, tz) => new Date(date).toLocaleDateString('en-CA', { timeZone: tz })
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2) }
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null)
const pct = (n, d) => (d ? Math.round((n / d) * 100) : null)

/** Everything the dashboard shows. `now` and `events` can be passed in for testing. */
export function summarize({ tz = 'Asia/Kolkata', now = new Date(), events = readEvents() } = {}) {
  const today = dayKey(now, tz)
  const dayN = (n) => dayKey(new Date(now.getTime() - n * 86400000), tz)
  const last7From = dayN(6)
  const last30From = dayN(29)

  const totals = {}
  for (const type of ['enrich', 'report']) {
    const mine = events.filter((e) => e.type === type)
    const done = mine.filter((e) => e.status === 'done')
    const inRange = (from) => done.filter((e) => dayKey(e.ts, tz) >= from).length
    totals[type] = {
      done: done.length,
      failed: mine.length - done.length,
      today: done.filter((e) => dayKey(e.ts, tz) === today).length,
      last7: inRange(last7From),
      last30: inRange(last30From),
      firstAt: mine[0]?.ts || null,
      successRate: pct(done.length, mine.length),
      seconds: { avg: avg(done.map((e) => e.secs).filter(Number.isFinite)), median: median(done.map((e) => e.secs).filter(Number.isFinite)) },
    }
  }

  const days = []
  for (let i = 29; i >= 0; i--) {
    const day = dayN(i)
    days.push({
      day,
      enrich: events.filter((e) => e.type === 'enrich' && e.status === 'done' && dayKey(e.ts, tz) === day).length,
      report: events.filter((e) => e.type === 'report' && e.status === 'done' && dayKey(e.ts, tz) === day).length,
    })
  }

  const failures = new Map()
  for (const e of events.filter((x) => x.status === 'failed')) {
    const k = `${e.type}|${e.reason || 'Other'}`
    failures.set(k, (failures.get(k) || 0) + 1)
  }
  const failureList = [...failures.entries()].map(([k, count]) => { const [type, reason] = k.split('|'); return { type, reason, count } }).sort((a, b) => b.count - a.count)

  const enrichDone = events.filter((e) => e.type === 'enrich' && e.status === 'done')
  const quality = {
    runs: enrichDone.length,
    avgAttributes: avg(enrichDone.map((e) => e.attrs).filter(Number.isFinite)),
    avgTechnical: avg(enrichDone.map((e) => e.technical).filter(Number.isFinite)),
    pctAtLeast15: pct(enrichDone.filter((e) => e.attrs >= 15).length, enrichDone.length),
    pctTechnical6: pct(enrichDone.filter((e) => e.technical >= 6).length, enrichDone.length),
    pctImage: pct(enrichDone.filter((e) => e.image).length, enrichDone.length),
    pctTaxonomy: pct(enrichDone.filter((e) => e.taxonomy).length, enrichDone.length),
  }

  const hostCounts = new Map()
  for (const e of events.filter((x) => x.status === 'done' && x.host)) hostCounts.set(e.host, (hostCounts.get(e.host) || 0) + 1)
  const topHosts = [...hostCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([host, count]) => ({ host, count }))

  const recent = events.slice(-25).reverse().map((e) => ({
    ts: e.ts, type: e.type, status: e.status, secs: e.secs, url: e.url, host: e.host, company: e.company, name: e.name, email: e.email,
    attrs: e.attrs ?? null, emailStatus: e.emailStatus || '', reason: e.reason || '',
  }))

  return { generatedAt: now.toISOString(), tz, totals, days, failures: failureList, quality, topHosts, recent }
}
