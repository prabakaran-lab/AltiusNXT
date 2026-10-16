import { Router } from 'express'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { summarize } from '../services/usageStats.js'
import { renderDashboard } from './adminPage.js'

/**
 * The owner's private usage dashboard.
 *
 * Off unless BOTH ADMIN_PASSWORD (10+ characters) and ADMIN_PATH (16-64 letters / digits / - _) are set in server/.env.
 * - POST /api/x/session        checks the password and, if right, sets a signed, HttpOnly cookie and returns the secret address.
 * - GET  /api/<ADMIN_PATH>/    the dashboard page      (cookie required)
 * - GET  /api/<ADMIN_PATH>/data  the numbers          (cookie required)
 * - POST /api/<ADMIN_PATH>/logout
 * Anything without a valid cookie falls through to the normal "not found" answer, so a stranger cannot tell the dashboard exists.
 * Read-only: it never changes anything else on the site.
 */

const router = Router()

const cfg = () => {
  const password = String(process.env.ADMIN_PASSWORD || '')
  const secretPath = String(process.env.ADMIN_PATH || '')
  const ok = password.length >= 10 && /^[A-Za-z0-9_-]{16,64}$/.test(secretPath)
  return {
    ok,
    password,
    secretPath,
    hours: Math.min(72, Math.max(1, Number(process.env.ADMIN_SESSION_HOURS) || 12)),
    tz: process.env.ADMIN_TZ || 'Asia/Kolkata',
    key: crypto.createHash('sha256').update(`ops-session:${process.env.ADMIN_SESSION_SECRET || ''}:${password}`).digest(),
  }
}

const COOKIE = 'ops_s'
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest()
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b))

const sign = (c, exp) => crypto.createHmac('sha256', c.key).update(String(exp)).digest('base64url')
const makeToken = (c) => { const exp = Date.now() + c.hours * 3600 * 1000; return `${exp}.${sign(c, exp)}` }
function validToken(c, token) {
  const [exp, mac] = String(token || '').split('.')
  if (!exp || !mac || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false
  const want = Buffer.from(sign(c, exp))
  const got = Buffer.from(mac)
  return want.length === got.length && crypto.timingSafeEqual(want, got)
}
const cookieOf = (req) => {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return ''
}

// Wrong passwords are limited hard; a right one does not count against the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  skipSuccessfulRequests: true,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
})

router.post('/x/session', (req, res, next) => (cfg().ok ? next() : next('router')), loginLimiter, (req, res) => {
  const c = cfg()
  const given = String(req.body?.password || '')
  if (!given || !safeEqual(given, c.password)) return res.status(401).json({ error: 'That did not work.' })
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.cookie(COOKIE, makeToken(c), { httpOnly: true, sameSite: 'strict', secure, path: '/api/', maxAge: c.hours * 3600 * 1000 })
  res.set('Cache-Control', 'no-store')
  res.json({ ok: true, url: `/api/${c.secretPath}/` })
})

// Everything under the secret path needs the cookie; without it the request moves on and ends as an ordinary 404.
router.use((req, res, next) => {
  const c = cfg()
  if (!c.ok) return next()
  const prefix = `/${c.secretPath}`
  if (req.path !== prefix && !req.path.startsWith(`${prefix}/`)) return next()
  if (!validToken(c, cookieOf(req))) return next()

  res.set({
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  })
  const sub = req.path.slice(prefix.length).replace(/^\/+/, '')
  if (req.method === 'GET' && sub === '') {
    const nonce = crypto.randomBytes(16).toString('base64')
    res.set('Content-Security-Policy', `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`)
    return res.type('html').send(renderDashboard(nonce, `/api/${c.secretPath}/`))
  }
  if (req.method === 'GET' && sub === 'data') return res.json(summarize({ tz: c.tz }))
  if (req.method === 'POST' && sub === 'logout') {
    res.clearCookie(COOKIE, { path: '/api/' })
    return res.json({ ok: true })
  }
  return next()
})

export default router
