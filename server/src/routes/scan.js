import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { runSiteScan } from '../services/quickScan15.js'
import { isGeminiConfigured } from '../config.js'
import { requireTurnstile } from '../services/turnstile.js'

const router = Router()

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scans from this address in the last hour. Please try again later.' },
})

router.post('/quick-scan', limiter, requireTurnstile(), async (req, res) => {
  const { url } = req.body || {}
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Please provide a valid product page URL (starting with http:// or https://).' })
  }

  if (!isGeminiConfigured()) {
    return res.status(503).json({ error: 'The AI analysis engine is not configured yet. Please contact AltiusNxt to enable it.' })
  }

  try {
    // Fifteen evidence-based checks measured on the page itself (quickScan15.js).
    const result = await runSiteScan(url)
    res.json({ ...result, url })
  } catch (err) {
    console.error('quick-scan failed:', err)
    // 422 rather than 502: proxies/CDNs pass 4xx bodies through but replace 5xx with their own page.
    res.status(422).json({ error: `Could not analyze that page: ${err.message}` })
  }
})

export default router
