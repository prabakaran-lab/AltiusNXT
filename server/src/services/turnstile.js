import { config, isTurnstileConfigured } from '../config.js'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Verifies a Cloudflare Turnstile widget token server-side. Returns true when it checks out, or when
 *  TURNSTILE_SECRET_KEY is not set yet (so forms keep working before the keys are configured) — that
 *  case logs a warning so it is not silently forgotten in production. */
export async function verifyTurnstile(token, remoteIp) {
  if (!isTurnstileConfigured()) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — captcha check skipped.')
    return true
  }
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret: config.turnstile.secretKey, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(10000) })
    const data = await res.json()
    return Boolean(data.success)
  } catch (err) {
    console.error('[turnstile] verification request failed:', err.message)
    return false
  }
}

/** Express middleware: reads `turnstileToken` from the body, 400s when it does not verify. */
export function requireTurnstile(fieldName = 'turnstileToken') {
  return async (req, res, next) => {
    const ok = await verifyTurnstile(req.body?.[fieldName], req.ip)
    if (!ok) return res.status(400).json({ error: 'Captcha verification failed. Please try again.' })
    next()
  }
}
