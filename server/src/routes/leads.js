import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { sendLeadNotification, sendReportRequestAck } from '../services/mailer.js'
import { recordUsage } from '../services/usageStats.js'
import { isVerified } from '../services/otp.js'
import { isMailConfigured } from '../config.js'

const router = Router()

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many report requests from this address in the last hour. Please try again later.' },
})

const REQUIRED_FIELDS = ['firstName', 'company', 'email', 'url', 'revenueBracket']
const REVENUE_VALUES = ['under_5m', '5m_25m', '25m_100m', 'over_100m']

// An AI Readiness Report request. The team prepares the full report by hand and reaches out to the visitor shortly, so the
// request is simply passed on: the team is emailed at once (seconds, not minutes) with the visitor's details and the AI
// readiness score from the quick scan the visitor already ran on the page. No report is generated here.
router.post('/leads', limiter, async (req, res) => {
  const body = { ...(req.body || {}) }
  // The form asks for one "Name"; split it so the email keeps using first and last name.
  if (body.name && !body.firstName) {
    const parts = String(body.name).trim().split(/\s+/)
    body.firstName = parts.shift() || ''
    body.lastName = parts.join(' ')
  }
  const missing = REQUIRED_FIELDS.filter((f) => !String(body[f] || '').trim())
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' })
  }
  if (!REVENUE_VALUES.includes(body.revenueBracket)) {
    return res.status(400).json({ error: 'Please choose your approximate annual revenue.' })
  }
  if (!isVerified(body.email, body.verifyToken)) {
    return res.status(403).json({ error: 'Please verify your email address first.', code: 'EMAIL_NOT_VERIFIED' })
  }
  if (!/^https?:\/\//i.test(String(body.url))) {
    return res.status(400).json({ error: 'Please provide a valid product page URL (starting with http:// or https://).' })
  }

  const lead = {
    firstName: String(body.firstName).trim(),
    lastName: String(body.lastName || '').trim(),
    company: String(body.company).trim(),
    companyWebsite: String(body.companyWebsite || '').trim(),
    email: String(body.email).trim(),
    jobTitle: String(body.jobTitle || '').trim(),
  }
  const url = String(body.url).trim()
  // the score the visitor was shown after the quick scan (0-100), when the page sent it
  const raw = Number(body.quickScan?.score)
  const score = Number.isFinite(raw) && raw >= 0 && raw <= 100 ? Math.round(raw) : null

  const t0 = Date.now()
  let emailStatus = 'skipped'
  let error = ''
  if (isMailConfigured()) {
    // both at once: the team is notified, and the visitor gets a confirmation that the team will reach out shortly
    const [team, visitor] = await Promise.allSettled([sendLeadNotification({ lead, url, score }), sendReportRequestAck({ lead, url, score })])
    if (team.status === 'fulfilled') {
      emailStatus = 'sent'
      console.log(`[leads] team notified for ${lead.company} (${url}) in ${Date.now() - t0}ms`)
    } else {
      // the visitor still gets their on-page confirmation; the failure is logged and shows on the usage dashboard
      emailStatus = 'failed'
      error = team.reason?.message || String(team.reason)
      console.error(`[leads] team notification failed for ${lead.company} (${lead.email}, ${url}):`, error)
    }
    if (visitor.status === 'rejected') console.error(`[leads] confirmation email to ${lead.email} failed:`, visitor.reason?.message || visitor.reason)
  } else {
    console.warn('Email not configured — skipping send. Set GMAIL_USER / GMAIL_APP_PASSWORD to enable.')
  }
  recordUsage({ type: 'report', status: emailStatus === 'failed' ? 'failed' : 'done', secs: (Date.now() - t0) / 1000, url, company: lead.company, name: `${lead.firstName} ${lead.lastName}`.trim(), email: lead.email, emailStatus, ...(error ? { error } : {}) })

  res.json({ ok: true, review: true })
})

export default router
