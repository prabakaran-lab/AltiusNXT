import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Small MailerLite helper shared by the newsletter signup and the new-content announcements. */

const STATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'newsletter-state.json') // git-ignored (server/*.json)
const GROUP_NAME = process.env.NEWSLETTER_GROUP_NAME || 'AltiusNxt website newsletter'

export const mailerliteKey = () => (process.env.MAILERLITE_API_KEY || '').trim()
const base = () => (process.env.MAILERLITE_API_URL || 'https://connect.mailerlite.com/api').replace(/\/$/, '')

/** One API call. Resolves { status, data } and never throws on an HTTP error status. */
export async function ml(pathname, { method = 'GET', body } = {}) {
  const res = await fetch(`${base()}${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${mailerliteKey()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  let data = null
  try { data = await res.json() } catch { /* an empty body is fine */ }
  return { status: res.status, data }
}

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')) } catch { return {} } }
const writeState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2))

/** The group every website subscriber is added to, and every announcement is sent to.
 *  MAILERLITE_GROUP_ID if set; otherwise a group with a fixed name is found or created once and remembered. */
export async function ensureGroupId() {
  if (process.env.MAILERLITE_GROUP_ID?.trim()) return process.env.MAILERLITE_GROUP_ID.trim()
  const state = readState()
  if (state.groupId) return String(state.groupId)
  const found = await ml(`/groups?filter[name]=${encodeURIComponent(GROUP_NAME)}&limit=50`)
  let group = found.data?.data?.find((g) => g.name === GROUP_NAME)
  if (!group) {
    const made = await ml('/groups', { method: 'POST', body: { name: GROUP_NAME } })
    if (made.status !== 200 && made.status !== 201) throw new Error(`MailerLite could not create the "${GROUP_NAME}" group (HTTP ${made.status})`)
    group = made.data?.data
  }
  writeState({ ...state, groupId: String(group.id), groupName: GROUP_NAME })
  return String(group.id)
}
