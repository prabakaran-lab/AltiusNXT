import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

/**
 * Live audit bookings for AltiusNxt's booth at B2B eCommerce World 2026.
 *
 * 20 thirty-minute live audit slots: 10 on each event day. Each slot can be booked once, and each work email can hold one
 * booking. Bookings are kept in server/data/event-bookings.json (server/data is not in git), written atomically (temp file
 * then rename) and changed one at a time behind a lock, so two visitors who pick the same slot at the same moment can never
 * both get it. The file is the record: the admin dashboard reads it, and a cancelled booking frees its slot again.
 */

export const EVENT = {
  name: 'B2B eCommerce World 2026',
  booth: 'Booth 52',
  venue: 'JW Marriott, Indianapolis',
  tz: 'America/Indiana/Indianapolis',
  tzLabel: 'EST',
  // Indianapolis is on Eastern Standard Time (UTC-5) on these dates
  utcOffsetHours: -5,
  slotMinutes: 30,
  days: [
    { date: '2026-11-02', label: 'Mon, Nov 2' },
    { date: '2026-11-03', label: 'Tue, Nov 3' },
  ],
  // 24-hour local start times; shown as "10:00 AM"
  times: ['10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00'],
}
export const TOTAL_SLOTS = EVENT.days.length * EVENT.times.length

export const timeLabel = (t) => {
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
export const dayLabel = (date) => EVENT.days.find((d) => d.date === date)?.label || date
/** The slot's start as a real moment in time (UTC), from the local event time. */
export const slotStart = (date, time) => {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, m] = time.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h - EVENT.utcOffsetHours, m))
}

const DIR = process.env.USAGE_DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data')
const FILE = path.join(DIR, 'event-bookings.json')

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return Array.isArray(data?.bookings) ? data.bookings : []
  } catch {
    return []
  }
}
function save(bookings) {
  fs.mkdirSync(DIR, { recursive: true })
  const tmp = `${FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ event: EVENT.name, updatedAt: new Date().toISOString(), bookings }, null, 2))
  fs.renameSync(tmp, FILE)
}

let bookings = load()
// every change goes through this chain, one after another
let queue = Promise.resolve()
const locked = (fn) => {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

const active = () => bookings.filter((b) => b.status === 'confirmed')
const norm = (e) => String(e || '').trim().toLowerCase()

/** Which slots are free, for the booking form and the floating widget. */
export function availability() {
  const taken = new Set(active().map((b) => `${b.date} ${b.time}`))
  const days = EVENT.days.map((d) => {
    const slots = EVENT.times.map((t) => ({ time: t, label: timeLabel(t), available: !taken.has(`${d.date} ${t}`) }))
    return { date: d.date, label: d.label, remaining: slots.filter((s) => s.available).length, slots }
  })
  return {
    event: { name: EVENT.name, booth: EVENT.booth, venue: EVENT.venue, tzLabel: EVENT.tzLabel, slotMinutes: EVENT.slotMinutes },
    total: TOTAL_SLOTS,
    remaining: days.reduce((n, d) => n + d.remaining, 0),
    days,
  }
}

export class BookingError extends Error {
  constructor(message, code) { super(message); this.code = code }
}

/** Books one slot. Throws BookingError('...', 'SLOT_TAKEN' | 'ALREADY_BOOKED' | 'FULL' | 'BAD_SLOT'). */
export function book({ name, email, company, jobTitle = '', website, date, time }) {
  return locked(() => {
    if (!EVENT.days.some((d) => d.date === date) || !EVENT.times.includes(time)) throw new BookingError('Please choose one of the listed dates and time slots.', 'BAD_SLOT')
    const live = active()
    if (live.length >= TOTAL_SLOTS) throw new BookingError('All 20 live audit slots are now booked.', 'FULL')
    if (live.some((b) => b.date === date && b.time === time)) throw new BookingError(`The ${timeLabel(time)} slot on ${dayLabel(date)} was just booked by someone else. Please choose another time.`, 'SLOT_TAKEN')
    const mine = live.find((b) => norm(b.email) === norm(email))
    if (mine) throw new BookingError(`This email already has a live audit booked: ${dayLabel(mine.date)} at ${timeLabel(mine.time)} ${EVENT.tzLabel} (reference ${mine.ref}).`, 'ALREADY_BOOKED')

    const booking = {
      id: randomUUID(),
      ref: `BEW-${String(bookings.length + 1).padStart(3, '0')}`,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      date, time, name, email, company, jobTitle, website,
    }
    bookings = [...bookings, booking]
    save(bookings)
    return { booking, availability: availability() }
  })
}

/** Cancels a booking (admin), which frees its slot again. */
export function cancel(id) {
  return locked(() => {
    const b = bookings.find((x) => x.id === id)
    if (!b) throw new BookingError('That booking does not exist.', 'NOT_FOUND')
    if (b.status !== 'confirmed') return b
    const updated = { ...b, status: 'cancelled', cancelledAt: new Date().toISOString() }
    bookings = bookings.map((x) => (x.id === id ? updated : x))
    save(bookings)
    return updated
  })
}

/** Every booking, newest first, for the admin dashboard and its CSV download. */
export const allBookings = () => [...bookings].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
