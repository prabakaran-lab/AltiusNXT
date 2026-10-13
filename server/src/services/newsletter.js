import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isMailConfigured } from '../config.js'
import { sendSubscriberNotification } from './catalogwizMail.js'
import { ensureGroupId } from './mailerlite.js'

/**
 * Newsletter signup.
 *
 *  - MailerLite is the mailing list. With MAILERLITE_API_KEY set, every new address is added through its API
 *    (optionally into one group, and optionally as "unconfirmed" so MailerLite sends its double opt-in email).
 *  - Every signup is also kept in server/subscribers.json (git-ignored: it holds personal data) and the team is told
 *    by email. So the signup works, and is never lost, before MailerLite is connected or if it is briefly down.
 *
 * Environment (all optional):
 *   MAILERLITE_API_KEY          API token from MailerLite > Integrations > API
 *   MAILERLITE_GROUP_ID         numeric group id to add subscribers to
 *   MAILERLITE_DOUBLE_OPT_IN    "true" to create subscribers as unconfirmed (MailerLite then sends the confirmation email;
 *                               turn on "Double opt-in for API and integrations" in MailerLite > Subscribe settings)
 *   MAILERLITE_API_URL          override of https://connect.mailerlite.com/api (testing only)
 */

const STORE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'subscribers.json')

export class SubscribeError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}

const loadStore = () => { try { return JSON.parse(fs.readFileSync(STORE, 'utf8')) } catch { return [] } }
const saveStore = (list) => { fs.writeFileSync(`${STORE}.tmp`, JSON.stringify(list, null, 2)); fs.renameSync(`${STORE}.tmp`, STORE) }

export const isNewsletterProviderConfigured = () => Boolean(process.env.MAILERLITE_API_KEY)
const doubleOptIn = () => /^(1|true|yes)$/i.test(process.env.MAILERLITE_DOUBLE_OPT_IN || '')

async function addToMailerLite(email) {
  const base = (process.env.MAILERLITE_API_URL || 'https://connect.mailerlite.com/api').replace(/\/$/, '')
  const body = { email }
  // every website subscriber joins one group, so announcements can be sent to exactly that audience
  try { body.groups = [await ensureGroupId()] } catch (err) { console.error('[newsletter] could not resolve the subscriber group:', err.message) }
  if (doubleOptIn()) body.status = 'unconfirmed'
  const res = await fetch(`${base}/subscribers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  if (res.status === 200 || res.status === 201) return
  if (res.status === 422) throw new SubscribeError('That email address was not accepted. Please check it and try again.', 400)
  throw new Error(`MailerLite responded ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
}

/** Adds one address. Returns { status: 'subscribed' | 'already', provider, needsConfirmation }. */
export async function subscribeEmail({ email, source }) {
  email = String(email || '').trim().toLowerCase()
  const list = loadStore()
  const known = list.find((s) => s.email === email)

  let provider = 'local'
  if (isNewsletterProviderConfigured()) {
    try {
      await addToMailerLite(email)
      provider = 'mailerlite'
    } catch (err) {
      if (err instanceof SubscribeError) throw err
      // the provider is down or misconfigured: the signup is still kept locally and the team is told
      console.error('[newsletter] MailerLite failed, kept locally:', err.message)
    }
  }

  if (!known) {
    list.push({ email, source: source || 'website', at: new Date().toISOString(), provider })
    saveStore(list)
    if (isMailConfigured()) sendSubscriberNotification({ email, source, provider }).catch((err) => console.error('[newsletter] notification email failed:', err.message))
    else console.warn('[newsletter] email not configured; new subscriber not emailed:', email)
  }
  return { status: known ? 'already' : 'subscribed', provider, needsConfirmation: provider === 'mailerlite' && doubleOptIn() }
}
