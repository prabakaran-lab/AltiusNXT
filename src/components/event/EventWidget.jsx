import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Building2, CalendarDays, CalendarPlus, Check, ChevronDown, Clock, Link2, Mail, MapPin, User, Users, X } from 'lucide-react'
import { bookEventAudit, getEventSlots } from '../../services/api.js'
import './EventWidget.css'

/* B2B eCommerce World 2026: a compact badge fixed to the right edge of every page, and the "Book your Live Audit Slot" popup.
   The 20 slots and which are free come from the server (GET /api/event-audit/slots); a booking is saved, checked against
   double booking and emailed by the server (POST /api/event-audit/book), and the count changes only after it succeeds.
   The badge sits on the side of the window (it never moves the page) and is hidden once the event is over. */

const EVENT_OVER = Date.UTC(2026, 10, 4, 5, 0) // the night after Nov 3, Indianapolis time
const SKYLINE = '/assets/event/indianapolis-panel.webp'
const EMPTY = { name: '', email: '', company: '', website: '', company_site: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SITE_RE = /^(https?:\/\/)?[^\s/$.?#]+\.[^\s]{2,}$/i

/** The event mark: a cube in a hexagon. */
function HexMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 2.5 35.2 11.25v17.5L20 37.5 4.8 28.75v-17.5L20 2.5Z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M20 10.5 28 15v9.4L20 29l-8-4.6V15l8-4.5Z" fill="#ff7a1a" />
      <path d="M12 15l8 4.6 8-4.6M20 19.6V29" stroke="#0b1430" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/** A "save to Google Calendar" link for the booked 30-minute slot (Indianapolis is UTC-5 on these dates). */
function calendarLink(b) {
  const [y, m, d] = b.date.split('-').map(Number)
  const [h, min] = b.time.split(':').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d, h + 5, min))
  const end = new Date(start.getTime() + 30 * 60000)
  const f = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: 'TEMPLATE', text: 'AltiusNxt live AI-readiness audit (Booth 52)', dates: `${f(start)}/${f(end)}`,
    location: 'B2B eCommerce World 2026, Booth 52, JW Marriott, Indianapolis', details: `Your live audit with AltiusNxt. Reference ${b.ref}.`,
  })}`
}

/** Field-by-field checks, with short messages shown under each field. */
function validate(f, date, time) {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Enter your full name'
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid work email'
  if (!f.company.trim()) e.company = 'Enter your company name'
  if (!SITE_RE.test(f.website.trim())) e.website = 'Enter your website, e.g. acme.com'
  if (!date) e.date = 'Choose a date'
  if (!time) e.time = 'Choose a time slot'
  return e
}

/** A labelled field with its icon inside the box and its message underneath. */
function Field({ id, label, icon: Icon, error, children, select }) {
  return (
    <div className={`evf${error ? ' bad' : ''}`}>
      <label htmlFor={id}>{label}<i aria-hidden="true">*</i></label>
      <div className={`evf-box${select ? ' sel' : ''}`}>
        <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
        {children}
        {select && <ChevronDown className="evf-chev" size={16} aria-hidden="true" />}
      </div>
      <p className="evf-err" id={`${id}-err`} role={error ? 'alert' : undefined}>{error || ''}</p>
    </div>
  )
}

function BookingDialog({ avail, setAvail, loadFailed, reload, onClose }) {
  const uid = useId()
  const dialogRef = useRef(null)
  const firstRef = useRef(null)
  const [form, setForm] = useState(EMPTY)
  const [pickedDate, setDate] = useState('')
  const [pickedTime, setTime] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null)

  const days = avail?.days || []
  const total = avail?.total || 20
  const left = avail ? avail.remaining : null
  // until the visitor picks one, the first date that still has a free slot is chosen; a time someone else just took is dropped
  const date = pickedDate || (days.find((d) => d.remaining > 0) || days[0])?.date || ''
  const day = days.find((d) => d.date === date) || null
  const time = pickedTime && day?.slots.find((s) => s.time === pickedTime)?.available ? pickedTime : ''

  // every change builds on the latest form (fast typing and autofill change several fields in a row)
  const set = (k) => (e) => { const v = e.target.value; setForm((f) => ({ ...f, [k]: v })) }
  // messages appear after the first submit attempt, and update as the visitor fixes each field
  const errors = touched ? validate(form, date, time) : {}

  /* focus moves into the dialog, Tab stays inside it, Escape closes it; the page behind does not scroll */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([tabindex="-1"]), select')].filter((n) => n.offsetParent !== null)
      if (!items.length) return
      const [a, z] = [items[0], items[items.length - 1]]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])
  useEffect(() => { if (done) dialogRef.current?.querySelector('.evd-done .evd-cta')?.focus() }, [done])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setTouched(true)
    if (Object.keys(validate(form, date, time)).length) {
      // the first field with a problem gets focus, once the messages are on screen
      requestAnimationFrame(() => dialogRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    setSending(true)
    try {
      const params = new URLSearchParams(window.location.search)
      const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].map((k) => [k, params.get(k) || '']))
      const res = await bookEventAudit({ ...form, date, time, ...utm })
      if (res.availability) setAvail(res.availability)
      setDone(res.booking || { ref: '', date, time, name: form.name, email: form.email })
    } catch (err) {
      if (err.availability) setAvail(err.availability)
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const a11y = (k) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': `${uid}${k}-err`, 'aria-required': true })
  const full = left === 0
  const dayName = (d) => d.label.replace(/^\w+, /, '') // "Mon, Nov 2" -> "Nov 2"
  const slotLabel = (b) => {
    const d = days.find((x) => x.date === b.date)
    return `${d ? dayName(d) : b.date}, 2026 · ${d?.slots.find((s) => s.time === b.time)?.label || b.time} EST`
  }

  return createPortal(
    <div className="evd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="evd" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${uid}title`}>
        {/* left: the event, over the Indianapolis skyline */}
        <aside className="evd-side" style={{ '--sky': `url(${SKYLINE})` }}>
          <span className="evd-pill">We’re Attending</span>
          <div className="evd-brand"><HexMark size={44} /><span>B2B eCommerce<br />World <b>2026</b></span></div>
          <p className="evd-story">Be Found.<br />Be Trusted.<br /><b>Be Recommended.</b></p>
          <ul className="evd-facts">
            <li><CalendarDays size={17} />Nov 1–3, Indianapolis</li>
            <li><MapPin size={17} />JW Marriott</li>
            <li><CalendarDays size={17} />Booth 52</li>
          </ul>
          <div className="evd-slots" aria-live="polite">
            <span className="evd-slots-ic"><Users size={18} /></span>
            <span><b>{left == null ? '20' : left} Live Audit Slot{left === 1 ? '' : 's'}</b><small>{full ? 'Fully booked' : left != null && left < total ? `${left} of ${total} left · limited availability` : 'Limited availability'}</small></span>
            <span className="evd-slots-go"><ArrowRight size={15} /></span>
          </div>
        </aside>

        {/* right: the booking */}
        <section className="evd-main">
          <button type="button" className="evd-x" aria-label="Close" onClick={onClose}><X size={20} /></button>
          {done ? (
            <div className="evd-body evd-done" role="status">
              <span className="evd-ok"><Check size={24} strokeWidth={3} /></span>
              <p className="evd-eb">Booking confirmed</p>
              <h2 id={`${uid}title`}>You’re booked</h2>
              <p className="evd-sub">Thank you{done.name ? `, ${done.name.split(' ')[0]}` : ''}. We look forward to meeting you at Booth 52.</p>
              <ul className="evd-sum">
                <li><span>When</span><b>{slotLabel(done)}</b></li>
                <li><span>Where</span><b>Booth 52 · JW Marriott, Indianapolis</b></li>
                {done.ref && <li><span>Reference</span><b>{done.ref}</b></li>}
              </ul>
              <p className="evd-note">A confirmation and calendar invite have been sent to <b>{done.email}</b>.</p>
              <div className="evd-done-actions">
                <a className="evd-ghost" href={calendarLink(done)} target="_blank" rel="noopener noreferrer"><CalendarPlus size={16} />Add to Google Calendar</a>
                <button type="button" className="evd-cta" onClick={onClose}>Done</button>
              </div>
            </div>
          ) : (
            <form className="evd-body" onSubmit={submit} noValidate>
              <p className="evd-eb">Book your</p>
              <h2 id={`${uid}title`}>Live Audit Slot</h2>
              <p className="evd-sub">Let’s talk about your product data, AI readiness, and how to turn it into real business growth.</p>
              {full ? (
                <p className="evd-full">All 20 live audit slots are booked. To meet us at the event, email <a href="mailto:govind@altiusnxt.com?subject=B2B%20eCommerce%20World%202026">govind@altiusnxt.com</a> or visit Booth 52.</p>
              ) : (
                <>
                  <div className="evd-grid">
                    <Field id={`${uid}name`} label="Full Name" icon={User} error={errors.name}><input id={`${uid}name`} ref={firstRef} autoComplete="name" placeholder="John Smith" value={form.name} onChange={set('name')} {...a11y('name')} /></Field>
                    <Field id={`${uid}email`} label="Work Email" icon={Mail} error={errors.email}><input id={`${uid}email`} type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={set('email')} {...a11y('email')} /></Field>
                    <Field id={`${uid}company`} label="Company Name" icon={Building2} error={errors.company}><input id={`${uid}company`} autoComplete="organization" placeholder="Your company name" value={form.company} onChange={set('company')} {...a11y('company')} /></Field>
                    <Field id={`${uid}website`} label="Website URL" icon={Link2} error={errors.website}><input id={`${uid}website`} inputMode="url" autoComplete="url" placeholder="yourwebsite.com" value={form.website} onChange={set('website')} {...a11y('website')} /></Field>
                    <Field id={`${uid}date`} label="Preferred Date" icon={CalendarDays} error={errors.date} select>
                      <select id={`${uid}date`} value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} {...a11y('date')}>
                        {!days.length && <option value="">{loadFailed ? 'Could not load dates' : 'Loading…'}</option>}
                        {days.map((d) => <option key={d.date} value={d.date} disabled={d.remaining === 0}>{dayName(d)}, 2026 {d.remaining === 0 ? '(full)' : `(${d.remaining} left)`}</option>)}
                      </select>
                    </Field>
                    <Field id={`${uid}time`} label="Preferred Time Slot" icon={Clock} error={errors.time} select>
                      <select id={`${uid}time`} value={time} onChange={(e) => setTime(e.target.value)} className={time ? '' : 'ph'} {...a11y('time')}>
                        <option value="">Select time slot</option>
                        {(day?.slots || []).map((s) => <option key={s.time} value={s.time} disabled={!s.available}>{s.label} EST{s.available ? '' : ' (booked)'}</option>)}
                      </select>
                    </Field>
                  </div>
                  {loadFailed && !days.length && <p className="evd-load">We could not load the available slots. <button type="button" onClick={reload}>Try again</button></p>}
                  {/* a field people never see: bots fill it, and the server then ignores the request */}
                  <input className="evd-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company_site} onChange={set('company_site')} />
                  {error && <p className="evd-error" role="alert">{error}</p>}
                  {/* stays in view at the bottom whenever the form has to scroll (small screens) */}
                  <div className="evd-actions">
                    <button className="evd-cta" type="submit" disabled={sending}>{sending ? 'Reserving…' : <>Reserve My Audit Slot<ArrowRight size={18} /></>}</button>
                    <p className="evd-fine">You’ll receive a confirmation email with all the details.</p>
                  </div>
                </>
              )}
            </form>
          )}
        </section>
      </div>
    </div>,
    document.body,
  )
}

export default function EventWidget() {
  const btnRef = useRef(null)
  const [avail, setAvail] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [over] = useState(() => Date.now() > EVENT_OVER)

  const refresh = useCallback(() => {
    getEventSlots().then((a) => { setAvail(a); setLoadFailed(false) }).catch(() => setLoadFailed(true))
  }, [])
  useEffect(() => {
    if (over) return undefined
    refresh()
    const id = setInterval(refresh, 60000)
    return () => clearInterval(id)
  }, [over, refresh])

  const close = useCallback(() => { setOpen(false); refresh(); requestAnimationFrame(() => btnRef.current?.focus()) }, [refresh])
  if (over) return null
  const left = avail ? avail.remaining : null
  const leftText = left == null ? '20 live audit slots' : left === 0 ? 'Fully booked' : `${left} slots left`

  return (
    <>
      <button ref={btnRef} type="button" className="evb" onClick={() => { setOpen(true); refresh() }} aria-haspopup="dialog"
        aria-label={`B2B eCommerce World 2026, Booth 52. ${leftText}. Book your live audit slot.`}>
        <span className="evb-top"><HexMark size={32} /><span className="evb-name">B2B<br />Ecommerce<br />World 2026</span></span>
        <span className="evb-when">Nov 1–3<br />Indianapolis</span>
        <span className="evb-booth"><small>Booth</small><b>52</b></span>
        <span className="evb-slots"><Users size={18} /><b>{left ?? 20}</b><small>{left === 0 ? 'Fully booked' : 'Slots left'}</small></span>
        <span className="evb-go"><ArrowRight size={16} strokeWidth={2.6} /></span>
      </button>
      {open && <BookingDialog avail={avail} setAvail={setAvail} loadFailed={loadFailed} reload={refresh} onClose={close} />}
    </>
  )
}
