import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/* Email one-time codes for the AI Readiness Report.
   Visitor enters their email -> a 6-digit code is emailed -> they enter it -> they get a short-lived verification token
   that POST /leads requires for that same email. Everything lives in memory (codes expire in 10 minutes, tokens in 30),
   and only a hash of each code is kept. */

const CODE_TTL_MS = 10 * 60 * 1000
const TOKEN_TTL_MS = 30 * 60 * 1000
const RESEND_GAP_MS = 30 * 1000
const MAX_ATTEMPTS = 5
const MAX_SENDS_PER_HOUR = 5
const SECRET = randomBytes(16).toString('hex') // per process: restarting the server invalidates pending codes

const codes = new Map() // email -> { hash, expires, attempts, lastSent, sends: [timestamps] }
const tokens = new Map() // token -> { email, expires }

const norm = (email) => String(email || '').trim().toLowerCase()
const hash = (email, code) => createHash('sha256').update(`${SECRET}:${email}:${code}`).digest()

function prune() {
  const now = Date.now()
  for (const [k, v] of codes) if (v.expires < now && now - v.lastSent > 60 * 60 * 1000) codes.delete(k)
  for (const [k, v] of tokens) if (v.expires < now) tokens.delete(k)
}

/** Creates a code for this email. Returns { code } to be emailed, or { error, retryAfter } when the visitor must wait. */
export function createCode(emailRaw) {
  prune()
  const email = norm(emailRaw)
  const now = Date.now()
  const prev = codes.get(email)
  const sends = (prev?.sends || []).filter((t) => now - t < 60 * 60 * 1000)
  if (prev && now - prev.lastSent < RESEND_GAP_MS) {
    return { error: 'Please wait a few seconds before asking for another code.', retryAfter: Math.ceil((RESEND_GAP_MS - (now - prev.lastSent)) / 1000) }
  }
  if (sends.length >= MAX_SENDS_PER_HOUR) {
    return { error: 'Too many codes were requested for this email. Please try again in an hour.', retryAfter: 3600 }
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  codes.set(email, { hash: hash(email, code), expires: now + CODE_TTL_MS, attempts: 0, lastSent: now, sends: [...sends, now] })
  return { code }
}

/** Forgets a code that could not be delivered, so the visitor can retry straight away. */
export function discardCode(emailRaw) {
  codes.delete(norm(emailRaw))
}

/** Checks a code. On success returns { token }, which proves this email was verified. */
export function verifyCode(emailRaw, codeRaw) {
  const email = norm(emailRaw)
  const entry = codes.get(email)
  const code = String(codeRaw || '').replace(/\D/g, '')
  if (!entry || entry.expires < Date.now()) return { error: 'That code has expired. Please request a new one.' }
  if (entry.attempts >= MAX_ATTEMPTS) return { error: 'Too many wrong attempts. Please request a new code.' }
  entry.attempts += 1
  const given = hash(email, code)
  if (code.length !== 6 || !timingSafeEqual(entry.hash, given)) {
    return { error: `That code is not right. ${MAX_ATTEMPTS - entry.attempts} attempt${MAX_ATTEMPTS - entry.attempts === 1 ? '' : 's'} left.` }
  }
  codes.delete(email)
  const token = randomBytes(24).toString('hex')
  tokens.set(token, { email, expires: Date.now() + TOKEN_TTL_MS })
  return { token }
}

/** True when `token` was issued for this email and has not expired. */
export function isVerified(emailRaw, token) {
  const t = tokens.get(String(token || ''))
  return !!t && t.email === norm(emailRaw) && t.expires > Date.now()
}
