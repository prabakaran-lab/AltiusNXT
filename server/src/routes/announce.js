import { Router } from 'express'
import { config } from '../config.js'
import { checkForNewContent, announcementStatus } from '../services/announcements.js'

const router = Router()

// Internal only: the same x-outreach-token as /api/outreach/generate. A deploy hook (Netlify / GitHub Actions) can call
// POST /api/announce/check right after the site is published, instead of waiting for the next scheduled check.
function requireInternalToken(req, res, next) {
  const token = config.outreach?.apiToken
  if (!token) return res.status(503).json({ error: 'OUTREACH_API_TOKEN is not set on the server.' })
  if (req.headers['x-outreach-token'] !== token) return res.status(401).json({ error: 'Missing or invalid x-outreach-token header.' })
  next()
}

router.post('/announce/check', requireInternalToken, async (req, res) => {
  try {
    res.json(await checkForNewContent({ dryRun: Boolean(req.body?.dryRun) }))
  } catch (err) {
    console.error('[announce] check failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/announce/status', requireInternalToken, (req, res) => res.json(announcementStatus()))

export default router
