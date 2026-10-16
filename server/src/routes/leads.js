import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { buildOutreachReportData } from '../services/outreachPipeline.js'
import { generateOutreachReportPdf } from '../services/reportPdf.js'
import { sendLeadNotification, sendReportToLead } from '../services/mailer.js'
import { recordUsage } from '../services/usageStats.js'
import { isGeminiConfigured, isMailConfigured, config } from '../config.js'

const router = Router()

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many report requests from this address in the last hour. Please try again later.' },
})

const REQUIRED_FIELDS = ['firstName', 'lastName', 'company', 'email', 'url']

// Report generation runs the live multi-engine research and takes several minutes — longer than
// browsers, proxies and tunnels will hold a single HTTP request open. So POST /leads only
// validates and enqueues, returning a job id straight away, and the client polls GET /leads/:id
// until the job finishes. Jobs are kept in memory and expire after JOB_TTL_MS.
const JOB_TTL_MS = 45 * 60 * 1000
const jobs = new Map()

function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS
  for (const [id, job] of jobs) if (job.updatedAt < cutoff) jobs.delete(id)
}

async function runJob(job, { lead, url }) {
  const t0 = Date.now()
  const lap = (label) => console.log(`[leads ${job.id.slice(0, 8)} timing] ${label}: ${Date.now() - t0}ms`)
  const setStage = (stage) => { job.stage = stage; job.updatedAt = Date.now() }

  try {
    setStage('Running live buyer queries on ChatGPT, Claude and Gemini')
    // Self-serve mode: the visitor already chose this exact product page, so it's analyzed
    // directly rather than crawled for — see buildOutreachReportData's productUrl branch.
    const data = await buildOutreachReportData({
      company: lead.company,
      productUrl: url,
      contactName: `${lead.firstName} ${lead.lastName}`.trim(),
      contactTitle: lead.jobTitle,
      contactEmail: lead.email,
      location: '',
      timezoneLabel: '',
      senderName: config.outreach.senderName,
      senderTitle: config.outreach.senderTitle,
      senderEmail: config.outreach.senderEmail,
      revenueBracket: lead.revenueBracket,
    })
    lap('report data built')

    setStage('Laying out your PDF')
    const pdfBuffer = await generateOutreachReportPdf(data)
    lap('pdf done')

    let emailStatus = 'skipped'
    if (isMailConfigured()) {
      setStage('Emailing your report')
      await Promise.all([
        sendLeadNotification({ lead, url, data, pdfBuffer }).then(() => lap('email to govind done')),
        sendReportToLead({ lead, pdfBuffer }).then(() => lap('email to lead done')),
      ])
      emailStatus = 'sent'
    } else {
      console.warn('Email not configured — skipping send. Set GMAIL_USER / GMAIL_APP_PASSWORD to enable.')
    }
    lap('total')

    job.status = 'done'
    job.stage = 'Done'
    job.result = {
      ok: true,
      emailStatus,
      pdfBase64: pdfBuffer.toString('base64'),
      product: data.product,
      stats: data.stats,
    }
    recordUsage({ type: 'report', status: 'done', secs: (Date.now() - t0) / 1000, url, company: lead.company, name: `${lead.firstName} ${lead.lastName}`.trim(), email: lead.email, emailStatus })
  } catch (err) {
    console.error(`lead report generation failed (job ${job.id}, url ${url}, company ${lead.company}):`, err)
    job.status = 'failed'
    job.error = `Could not generate your report: ${err.message}`
    recordUsage({ type: 'report', status: 'failed', secs: (Date.now() - t0) / 1000, url, company: lead.company, name: `${lead.firstName} ${lead.lastName}`.trim(), email: lead.email, error: err.message })
  }
  job.updatedAt = Date.now()
}

router.post('/leads', limiter, (req, res) => {
  const body = req.body || {}
  const missing = REQUIRED_FIELDS.filter((f) => !String(body[f] || '').trim())
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' })
  }
  if (!/^https?:\/\//i.test(String(body.url))) {
    return res.status(400).json({ error: 'Please provide a valid product page URL (starting with http:// or https://).' })
  }
  if (!isGeminiConfigured()) {
    return res.status(503).json({ error: 'The AI analysis engine is not configured yet. Please contact AltiusNxt to enable it.' })
  }

  const lead = {
    firstName: body.firstName,
    lastName: body.lastName,
    company: body.company,
    companyWebsite: body.companyWebsite || '',
    email: body.email,
    jobTitle: body.jobTitle || '',
    // Sizes the revenue-at-risk estimate; empty ("prefer not to say") → $5M default in revenueRisk.js
    revenueBracket: body.revenueBracket || '',
  }
  const url = body.url

  pruneJobs()
  const job = { id: randomUUID(), status: 'running', stage: 'Queued', startedAt: Date.now(), updatedAt: Date.now(), result: null, error: null }
  jobs.set(job.id, job)
  runJob(job, { lead, url }) // intentionally not awaited

  res.status(202).json({ ok: true, jobId: job.id, status: job.status })
})

router.get('/leads/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId)
  if (!job) return res.status(404).json({ error: 'That report request has expired or does not exist. Please submit it again.' })
  const payload = {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    elapsedMs: Date.now() - job.startedAt,
  }
  if (job.status === 'done') return res.json({ ...payload, ...job.result })
  // A failed job is still a successful status lookup. It must NOT be a 5xx: CDNs/tunnels
  // (Cloudflare included) replace origin 5xx bodies with their own HTML error page, which
  // would hide the human-readable reason from the visitor.
  if (job.status === 'failed') return res.json({ ...payload, error: job.error })
  res.json(payload)
})

export default router
