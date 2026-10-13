import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { subscribeEmail, SubscribeError } from '../services/newsletter.js'

const router = Router()

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signups from this address in the last hour. Please try again later.' },
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

router.post('/subscribe', limiter, async (req, res) => {
  const { email, source, website } = req.body || {}

  // "website" is a hidden field a person never fills in; bots do. Pretend it worked and store nothing.
  if (website) return res.json({ ok: true, status: 'subscribed' })

  const address = String(email || '').trim()
  if (!address || address.length > 254 || !EMAIL_RE.test(address)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  try {
    const result = await subscribeEmail({ email: address, source: String(source || 'website').slice(0, 60) })
    res.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof SubscribeError) return res.status(err.status).json({ error: err.message })
    console.error('[subscribe] failed:', err)
    res.status(500).json({ error: 'We could not sign you up just now. Please try again in a moment.' })
  }
})

export default router
