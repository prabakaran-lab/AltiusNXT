import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { sendContactMessage } from '../services/mailer.js'
import { requireTurnstile } from '../services/turnstile.js'

const router = Router()

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages from this address. Please try again later or email sales@altiusnxt.com.' },
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clip = (v, n) => String(v ?? '').trim().slice(0, n)

router.post('/contact', limiter, requireTurnstile(), async (req, res) => {
  const b = req.body || {}
  // hidden honeypot field: real visitors never fill it, bots usually do
  if (b.website) return res.json({ ok: true })

  const msg = {
    name: clip(b.name, 120),
    email: clip(b.email, 160),
    company: clip(b.company, 160),
    designation: clip(b.designation, 100),
    message: clip(b.message, 4000),
  }
  if (!msg.name || !msg.email || !msg.message) return res.status(400).json({ error: 'Please fill in your name, email and message.' })
  if (!EMAIL.test(msg.email)) return res.status(400).json({ error: 'Please enter a valid email address.' })

  try {
    await sendContactMessage(msg)
    res.json({ ok: true })
  } catch (err) {
    console.error('[contact] send failed:', err.message)
    res.status(502).json({ error: 'We could not send your message right now. Please email sales@altiusnxt.com.' })
  }
})

export default router
