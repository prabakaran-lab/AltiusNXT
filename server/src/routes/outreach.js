import { Router } from 'express'
import { runOutreachPipeline, buildOutreachReportData } from '../services/outreachPipeline.js'
import { generateOutreachReportPdf } from '../services/reportPdf.js'
import { isGeminiConfigured, isMailConfigured, config } from '../config.js'

const router = Router()

const REQUIRED_FIELDS = ['company', 'website', 'contactEmail']

/**
 * Internal sales tool — not linked from the public site. No rate limiting (Govind-triggered,
 * low volume) but still requires the shared internal token so this can't be hit blind if the
 * URL ever leaks. Set OUTREACH_API_TOKEN in server/.env to enable.
 */
function requireInternalToken(req, res, next) {
  const token = config.outreach?.apiToken
  if (!token) {
    return res.status(503).json({ error: 'Outreach tool is not configured (set OUTREACH_API_TOKEN in server/.env).' })
  }
  if (req.headers['x-outreach-token'] !== token) {
    return res.status(401).json({ error: 'Missing or invalid x-outreach-token header.' })
  }
  next()
}

router.post('/outreach/generate', requireInternalToken, async (req, res) => {
  const body = req.body || {}
  const missing = REQUIRED_FIELDS.filter((f) => !String(body[f] || '').trim())
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` })
  }
  if (!isGeminiConfigured()) {
    return res.status(503).json({ error: 'The AI analysis engine is not configured yet.' })
  }

  const input = {
    company: body.company,
    website: body.website,
    contactName: body.contactName || '',
    contactTitle: body.contactTitle || '',
    contactEmail: body.contactEmail,
    location: body.location || '',
    timezoneLabel: body.timezoneLabel || '',
    senderName: body.senderName || 'Govind',
    senderTitle: body.senderTitle || 'Business Unit Head',
    senderEmail: body.senderEmail || config.mail.leadNotifyEmail,
  }

  const send = body.send !== false // default true; pass send:false to preview without emailing

  try {
    const data = await buildOutreachReportData(input)
    const pdfBuffer = await generateOutreachReportPdf(data)

    let emailStatus = 'skipped'
    if (send) {
      if (!isMailConfigured()) {
        return res.status(503).json({ error: 'Email is not configured on the server, and send:true was requested.' })
      }
      const { sendOutreachReport } = await import('../services/mailer.js')
      await sendOutreachReport({
        to: input.contactEmail,
        contactName: input.contactName,
        company: input.company,
        productName: data.product.name,
        pdfBuffer,
        filename: `AltiusNxt-AI-Readiness-Report-${input.company.replace(/\s+/g, '-')}.pdf`,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        unsubscribeEmail: input.senderEmail,
      })
      emailStatus = 'sent'
    }

    res.json({
      ok: true,
      emailStatus,
      product: data.product,
      stats: data.stats,
      pdfBase64: pdfBuffer.toString('base64'),
    })
  } catch (err) {
    console.error('outreach report generation failed:', err)
    res.status(502).json({ error: `Could not generate the outreach report: ${err.message}` })
  }
})

export default router
