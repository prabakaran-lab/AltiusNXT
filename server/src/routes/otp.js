import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createCode, discardCode, verifyCode } from '../services/otp.js'
import { sendOtpEmail } from '../services/mailer.js'
import { isMailConfigured } from '../config.js'

const router = Router()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification requests from this address. Please try again in a few minutes.' },
})
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this address. Please try again in a few minutes.' },
})

// POST /api/otp/send { email, name } -> emails a 6-digit code
router.post('/otp/send', sendLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim()
  if (!EMAIL.test(email) || email.length > 160) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (!isMailConfigured()) return res.status(503).json({ error: 'Email verification is not available right now. Please contact AltiusNxt.' })

  const made = createCode(email)
  if (made.error) return res.status(429).json({ error: made.error, retryAfter: made.retryAfter })
  try {
    await sendOtpEmail({ to: email, name: String(req.body?.name || '').slice(0, 80), code: made.code })
    res.json({ ok: true, retryAfter: 30 })
  } catch (err) {
    discardCode(email)
    console.error('otp email failed:', err.message)
    res.status(502).json({ error: 'We could not send the code. Please check the email address and try again.' })
  }
})

// POST /api/otp/verify { email, code } -> { token }
router.post('/otp/verify', verifyLimiter, (req, res) => {
  const out = verifyCode(req.body?.email, req.body?.code)
  if (out.error) return res.status(400).json({ error: out.error })
  res.json({ ok: true, token: out.token })
})

export default router
