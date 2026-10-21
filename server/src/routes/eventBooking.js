import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { availability, book, BookingError } from '../services/eventBookings.js'
import { sendEventBookingNotification, sendEventBookingConfirmation } from '../services/mailer.js'
import { upsertHubspotContact } from '../services/hubspot.js'
import { isMailConfigured } from '../config.js'

/**
 * Live audit bookings for B2B eCommerce World 2026 (the floating event widget on every page).
 *   GET  /api/event-audit/slots   which of the 20 slots are free
 *   POST /api/event-audit/book    books one slot; emails the team and the visitor (with a calendar invite)
 * Bookings are stored by services/eventBookings.js and listed on the owner's admin dashboard.
 */
const router = Router()

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking attempts from this address in the last hour. Please try again later.' },
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
/** "acme.com" or "https://acme.com/x": a public web address, with https:// added when it is missing. */
function websiteOf(v) {
  const s = clip(v, 300)
  if (!s) return ''
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    return /^https?:$/.test(u.protocol) && /\.[a-z]{2,}$/i.test(u.hostname) ? u.toString() : ''
  } catch {
    return ''
  }
}

router.get('/event-audit/slots', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(availability())
})

router.post('/event-audit/book', limiter, async (req, res) => {
  const b = req.body || {}
  // a hidden field people never see: anything in it means a bot filled the form
  if (clip(b.company_site, 10)) return res.json({ ok: true, availability: availability() })

  const entry = {
    name: clip(b.name, 120),
    email: clip(b.email, 200).toLowerCase(),
    company: clip(b.company, 160),
    // optional
    jobTitle: clip(b.jobTitle, 120),
    website: websiteOf(b.website),
    date: clip(b.date, 10),
    time: clip(b.time, 5),
  }
  const missing = [['name', 'full name'], ['email', 'work email'], ['company', 'company name'], ['date', 'preferred date'], ['time', 'time slot']]
    .filter(([k]) => !entry[k]).map(([, l]) => l)
  if (missing.length) return res.status(400).json({ error: `Please fill in: ${missing.join(', ')}.` })
  if (entry.name.length < 2) return res.status(400).json({ error: 'Please enter your full name.' })
  if (!EMAIL_RE.test(entry.email)) return res.status(400).json({ error: 'Please enter a valid work email address.' })
  if (!entry.website) return res.status(400).json({ error: 'Please enter a valid website address, for example yourcompany.com.' })

  let result
  try {
    result = await book(entry)
  } catch (err) {
    if (err instanceof BookingError) {
      const status = err.code === 'BAD_SLOT' ? 400 : 409
      return res.status(status).json({ error: err.message, code: err.code, availability: availability() })
    }
    console.error('[event-audit] booking failed:', err)
    return res.status(500).json({ error: 'We could not save your booking. Please try again.' })
  }

  const { booking } = result
  const remaining = result.availability.remaining
  console.log(`[event-audit] ${booking.ref} booked: ${booking.company} (${booking.email}) on ${booking.date} ${booking.time}, ${remaining} of 20 left`)

  // the booking is saved; emails and the CRM never decide whether it stands
  if (isMailConfigured()) {
    const [team, visitor] = await Promise.allSettled([
      sendEventBookingNotification({ booking, remaining }),
      sendEventBookingConfirmation({ booking }),
    ])
    if (team.status === 'rejected') console.error(`[event-audit] team email for ${booking.ref} failed:`, team.reason?.message || team.reason)
    if (visitor.status === 'rejected') console.error(`[event-audit] confirmation email to ${booking.email} failed:`, visitor.reason?.message || visitor.reason)
  } else {
    console.warn('[event-audit] email not configured; booking saved without emails:', booking.ref)
  }
  const [firstName, ...rest] = booking.name.split(' ')
  upsertHubspotContact({ email: booking.email, firstName, lastName: rest.join(' '), company: booking.company, utmSource: clip(b.utm_source, 120), utmMedium: clip(b.utm_medium, 120), utmCampaign: clip(b.utm_campaign, 120) || 'b2b-ecommerce-world-2026', utmContent: clip(b.utm_content, 120) || 'event-live-audit-widget' })
    .catch((err) => console.warn(`[event-audit] HubSpot contact save failed for ${booking.email}:`, err.message))

  res.json({
    ok: true,
    booking: { ref: booking.ref, date: booking.date, time: booking.time, name: booking.name, email: booking.email },
    availability: result.availability,
  })
})

export default router
