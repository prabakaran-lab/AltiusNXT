import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { enrichProductPage } from '../services/catalogwizEnrich.js'
import { sendDemoRequestNotification } from '../services/catalogwizMail.js'
import { recordUsage } from '../services/usageStats.js'
import { isGeminiConfigured, isMailConfigured } from '../config.js'

const router = Router()

// Each demo makes several Gemini calls (one with web search), so it is limited per visitor.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many enrichment demos from this address in the last hour. Please try again later.' },
})

// The enrichment takes about a minute, longer than a proxy will hold one request open, so POST only
// validates and enqueues; the page polls GET /catalogwiz-demo/:jobId until it finishes.
const JOB_TTL_MS = 30 * 60 * 1000
const jobs = new Map()
function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS
  for (const [id, job] of jobs) if (job.updatedAt < cutoff) jobs.delete(id)
}

/** Only public web pages: the server will fetch this address, so local / private ones are refused. */
function isPublicHttpUrl(value) {
  try {
    const u = new URL(String(value))
    if (!/^https?:$/.test(u.protocol)) return false
    const h = u.hostname.toLowerCase()
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.startsWith('[')) return false
    if (/^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false
    return true
  } catch {
    return false
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const validPhone = (p) => /^[+()\d][\d\s().+-]{5,24}$/.test(p) && p.replace(/\D/g, '').length >= 7

async function runJob(job, { lead, url }) {
  const t0 = Date.now()
  const setStage = (stage) => { job.stage = stage; job.updatedAt = Date.now() }
  try {
    job.result = await enrichProductPage(url, setStage)
    job.status = 'done'
    job.stage = 'Done'
    recordUsage({ type: 'enrich', status: 'done', secs: (Date.now() - t0) / 1000, url, company: lead.company, name: lead.name, email: lead.email, attrs: job.result.stats?.after, technical: job.result.stats?.technical, image: Boolean(job.result.image), taxonomy: Boolean(job.result.after?.taxonomy) })
    console.log(`[catalogwiz-demo ${job.id.slice(0, 8)}] ${lead.company}: ${job.result.stats.after} attributes (${job.result.stats.technical} technical) in ${Date.now() - t0}ms`)
  } catch (err) {
    console.error(`[catalogwiz-demo ${job.id.slice(0, 8)}] failed for ${url}:`, err.message)
    job.status = 'failed'
    job.error = `We couldn't enrich that page: ${err.message}`
    recordUsage({ type: 'enrich', status: 'failed', secs: (Date.now() - t0) / 1000, url, company: lead.company, name: lead.name, email: lead.email, error: err.message })
  }
  job.updatedAt = Date.now()
}

router.post('/catalogwiz-demo', limiter, (req, res) => {
  const b = req.body || {}
  const lead = {
    name: String(b.name || '').trim().slice(0, 120),
    company: String(b.company || '').trim().slice(0, 160),
    email: String(b.email || '').trim().slice(0, 200),
    phone: String(b.phone || '').trim().slice(0, 40),
  }
  const url = String(b.url || '').trim()

  const missing = ['name', 'company', 'email', 'phone'].filter((f) => !lead[f])
  if (missing.length) return res.status(400).json({ error: `Please fill in: ${missing.join(', ')}.` })
  if (!EMAIL_RE.test(lead.email)) return res.status(400).json({ error: 'Please provide a valid email address.' })
  if (!validPhone(lead.phone)) return res.status(400).json({ error: 'Please provide a valid phone number.' })
  if (!/^https?:\/\//i.test(url) || !isPublicHttpUrl(url)) return res.status(400).json({ error: 'Please provide a valid product page URL (starting with http:// or https://).' })
  if (!isGeminiConfigured()) return res.status(503).json({ error: 'The AI enrichment engine is not configured yet. Please contact AltiusNxt to enable it.' })

  // Tell the team who asked, whatever happens to the enrichment. A mail problem never blocks the demo.
  if (isMailConfigured()) {
    sendDemoRequestNotification({ lead, url }).catch((err) => console.error('[catalogwiz-demo] notification email failed:', err.message))
  } else {
    console.warn('[catalogwiz-demo] email not configured; request not emailed:', JSON.stringify({ ...lead, url }))
  }

  pruneJobs()
  const job = { id: randomUUID(), status: 'running', stage: 'Queued', updatedAt: Date.now(), result: null, error: null }
  jobs.set(job.id, job)
  runJob(job, { lead, url }) // intentionally not awaited

  res.status(202).json({ ok: true, jobId: job.id })
})

router.get('/catalogwiz-demo/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId)
  if (!job) return res.status(404).json({ error: 'That demo has expired. Please submit your page again.' })
  const payload = { jobId: job.id, status: job.status, stage: job.stage }
  if (job.status === 'done') return res.json({ ...payload, result: job.result })
  // A failed job is still a successful status lookup: proxies replace origin 5xx bodies with their own page.
  if (job.status === 'failed') return res.json({ ...payload, error: job.error })
  res.json(payload)
})

export default router
