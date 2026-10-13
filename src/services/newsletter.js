/* Newsletter signup: POST /api/subscribe. Same API base as services/api.js (VITE_API_URL, or the same origin / dev proxy). */
const BASE = import.meta.env.VITE_API_URL || ''

/** Resolves with { status: 'subscribed' | 'already', needsConfirmation }; rejects with a message that is safe to show.
 *  `trap` is the hidden "website" field of the form: a person leaves it empty, a bot fills it in. */
export async function subscribeToNewsletter(email, source = 'website', trap = '') {
  let res
  try {
    res = await fetch(`${BASE}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, website: trap }),
    })
  } catch {
    throw new Error('We could not reach the server. Please check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status}). Please try again.`)
  return data
}
