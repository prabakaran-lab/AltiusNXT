const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, init) {
  const res = await fetch(`${BASE}/api${path}`, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

const post = (path, body) =>
  request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const sendContact = (payload) => post('/contact', payload)

export const quickScan = (url) => post('/quick-scan', { url })

export const sendOtp = (payload) => post('/otp/send', payload)
export const verifyOtp = (payload) => post('/otp/verify', payload)

/** Requests the full AI Readiness Report. The team reviews it and reaches out to the visitor shortly,
 *  so this returns as soon as the request is accepted and the team has been notified. */
export async function requestReport(payload) {
  return post('/leads', payload)
}


// B2B eCommerce World 2026 live audit bookings (the floating event widget)
export const getEventSlots = () => request('/event-audit/slots', { cache: 'no-store' })
export async function bookEventAudit(payload) {
  const res = await fetch(`${BASE}/api/event-audit/book`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const data = await res.json().catch(() => ({}))
  // a taken slot comes back with the fresh availability, so the form can update itself
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { code: data.code, availability: data.availability })
  return data
}
