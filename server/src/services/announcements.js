import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ml, mailerliteKey, ensureGroupId } from './mailerlite.js'

/**
 * Emails subscribers when a new article, event or case study is published on the website.
 *
 *  1. Every build of the website publishes /resources-feed.json (all articles, events and case studies, each with a
 *     permanent id). This service reads it on a schedule (and on demand, see routes/announce.js).
 *  2. An item whose id has not been announced before is "new". The very first run only records what already exists
 *     (a baseline), so nobody is emailed about old content.
 *  3. New items are sent as ONE MailerLite campaign to the website newsletter group: a single announcement for one
 *     item, a short digest when several are published together. MailerLite adds the unsubscribe link and only
 *     reaches subscribers who are active (confirmed).
 *  4. An item is marked announced only after MailerLite accepted the campaign, so a failure is retried next run and
 *     nothing is ever sent twice.
 *
 * Environment:
 *   SITE_FEED_URL            e.g. https://your-site/resources-feed.json   (required; blank = feature off)
 *   SITE_URL                 the site's public address for links and images (default: the feed URL's origin)
 *   NEWSLETTER_FROM_EMAIL    a sender address verified in MailerLite (required to send)
 *   NEWSLETTER_FROM_NAME     default "AltiusNxt"
 *   NEWSLETTER_REPLY_TO      optional
 *   NEWSLETTER_FOOTER_ADDRESS  postal address line in the footer (default: the address shown in the website footer)
 *   ANNOUNCE_CHECK_MINUTES   how often the server checks (default 30; 0 = never automatically)
 */

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'announced.json') // git-ignored (server/*.json)
const MAX_ITEMS_PER_EMAIL = 6
const LABEL = { blog: 'New article', event: 'New event', 'case-study': 'New case study' }
const BUTTON = { blog: 'Read the article', event: 'View event details', 'case-study': 'Read the case study' }
const DEFAULT_ADDRESS = 'AltiusNxt Technologies · 31700 West Thirteen Mile Road, Suite 205, Farmington Hills, MI 48334, USA'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return { baselined: false, announced: [], history: [] } } }
const save = (s) => { fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(s, null, 2)); fs.renameSync(`${FILE}.tmp`, FILE) }

const feedUrl = () => (process.env.SITE_FEED_URL || '').trim()
const siteUrl = () => (process.env.SITE_URL || '').trim().replace(/\/$/, '') || (feedUrl() ? new URL(feedUrl()).origin : '')
const absolute = (p) => (!p ? '' : /^https?:\/\//i.test(p) ? p : `${siteUrl()}${p.startsWith('/') ? '' : '/'}${p}`)
export const canSendAnnouncements = () => Boolean(mailerliteKey() && (process.env.NEWSLETTER_FROM_EMAIL || '').trim() && feedUrl())

/** The email: one block per item, brand colours, the unsubscribe link MailerLite requires, a postal address footer. */
export function renderEmail(items) {
  const block = (i) => {
    const link = absolute(i.path)
    const img = absolute(i.image)
    return `
      <tr><td style="padding:28px 32px 8px">
        <div style="font:700 12px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#E8590C">${esc(LABEL[i.type] || 'New')}</div>
        ${img ? `<a href="${esc(link)}"><img src="${esc(img)}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:10px;margin:14px 0 4px"></a>` : ''}
        <h2 style="margin:12px 0 6px;font:700 22px/1.3 Arial,sans-serif;color:#0B1F3A"><a href="${esc(link)}" style="color:#0B1F3A;text-decoration:none">${esc(i.title)}</a></h2>
        ${i.when ? `<div style="font:600 14px/1.4 Arial,sans-serif;color:#E8590C;margin-bottom:6px">${esc(i.when)}</div>` : ''}
        <p style="margin:0 0 16px;font:400 15px/1.6 Arial,sans-serif;color:#4A5A72">${esc(i.summary)}</p>
        <a href="${esc(link)}" style="display:inline-block;background:#FF6A1A;color:#ffffff;font:700 15px/1 Arial,sans-serif;text-decoration:none;padding:13px 22px;border-radius:8px">${esc(BUTTON[i.type] || 'Read more')} &rarr;</a>
      </td></tr>`
  }
  const heading = items.length === 1 ? 'There is something new on the AltiusNxt website.' : `${items.length} new updates on the AltiusNxt website.`
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#F3F6FA">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F6FA"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
      <tr><td style="background:#0B1F3A;padding:22px 32px;font:700 22px/1 Arial,sans-serif;color:#ffffff">Altius<span style="color:#FF6A1A">Nxt</span></td></tr>
      <tr><td style="padding:26px 32px 0;font:400 16px/1.5 Arial,sans-serif;color:#0B1F3A">${esc(heading)}</td></tr>
      ${items.map(block).join('<tr><td style="padding:0 32px"><div style="border-top:1px solid #E3E9F2"></div></td></tr>')}
      <tr><td style="padding:18px 32px 28px"><a href="${esc(absolute('/resources'))}" style="font:700 14px/1 Arial,sans-serif;color:#E8590C;text-decoration:none">See all resources &rarr;</a></td></tr>
      <tr><td style="background:#F8FAFC;padding:20px 32px;font:400 12px/1.6 Arial,sans-serif;color:#6B7A90">
        You are receiving this email because you subscribed to AltiusNxt updates on our website.<br>
        <a href="{$unsubscribe}" style="color:#6B7A90">Unsubscribe</a><br>
        ${esc(process.env.NEWSLETTER_FOOTER_ADDRESS || DEFAULT_ADDRESS)}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

export function subjectFor(items) {
  if (items.length === 1) return `${LABEL[items[0].type] || 'New'}: ${items[0].title}`.slice(0, 150)
  return `New from AltiusNxt: ${items.length} new updates`
}

async function fetchFeed() {
  const res = await fetch(feedUrl(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`The content feed answered HTTP ${res.status}`)
  const feed = await res.json()
  if (!Array.isArray(feed?.items)) throw new Error('The content feed is not in the expected format (no "items" list)')
  return feed.items.filter((i) => i?.id && i.title && i.path)
}

let running = false

/** One check. `dryRun` reports what would be sent and changes nothing. */
export async function checkForNewContent({ dryRun = false } = {}) {
  if (running) return { skipped: 'a check is already running' }
  if (!feedUrl()) return { skipped: 'SITE_FEED_URL is not set, so announcements are off' }
  running = true
  try {
    const items = await fetchFeed()
    const state = load()
    const known = new Set(state.announced)
    const finish = (result) => { if (!dryRun) save({ ...load(), lastCheck: { at: new Date().toISOString(), ...result } }); return result }

    // first run: remember what exists, announce nothing
    if (!state.baselined) {
      if (dryRun) return { baseline: items.length, note: 'First run: the existing content would be recorded, nothing would be sent.' }
      save({ ...state, baselined: true, announced: items.map((i) => i.id), baselineAt: new Date().toISOString() })
      return finish({ baseline: items.length, note: 'Existing content recorded. Only items published from now on will be announced.' })
    }

    const fresh = items.filter((i) => !known.has(i.id)).sort((a, b) => String(b.date).localeCompare(String(a.date)))
    if (!fresh.length) return finish({ new: 0 })

    const chosen = fresh.slice(0, MAX_ITEMS_PER_EMAIL)
    const plan = { new: fresh.length, items: chosen.map((i) => i.id), subject: subjectFor(chosen) }
    if (dryRun) return { ...plan, wouldSend: canSendAnnouncements(), html: renderEmail(chosen) }
    if (!canSendAnnouncements()) return finish({ ...plan, skipped: 'Not sent: set MAILERLITE_API_KEY and NEWSLETTER_FROM_EMAIL (a sender verified in MailerLite). The items stay "new" and are sent as soon as that is set.' })

    const groupId = await ensureGroupId()
    const group = await ml(`/groups/${groupId}`)
    const recipients = group.data?.data?.active_count ?? null
    if (recipients === 0) {
      // nobody to tell yet: mark as announced so the first future subscriber is not sent old news
      save({ ...state, announced: [...state.announced, ...fresh.map((i) => i.id)] })
      return finish({ ...plan, recipients: 0, skipped: 'No active subscribers yet; marked as announced.' })
    }

    const from = process.env.NEWSLETTER_FROM_EMAIL.trim()
    const email = { subject: plan.subject, from_name: (process.env.NEWSLETTER_FROM_NAME || 'AltiusNxt').trim(), from, content: renderEmail(chosen) }
    if (process.env.NEWSLETTER_REPLY_TO) email.reply_to = process.env.NEWSLETTER_REPLY_TO.trim()
    const created = await ml('/campaigns', { method: 'POST', body: { name: `Website update: ${plan.subject}`.slice(0, 120), type: 'regular', emails: [email], groups: [groupId] } })
    if (created.status !== 201 && created.status !== 200) throw new Error(`MailerLite refused the campaign (HTTP ${created.status}): ${JSON.stringify(created.data).slice(0, 300)}`)
    const campaignId = created.data?.data?.id
    const sent = await ml(`/campaigns/${campaignId}/schedule`, { method: 'POST', body: { delivery: 'instant' } })
    if (sent.status !== 200 && sent.status !== 201) {
      await ml(`/campaigns/${campaignId}`, { method: 'DELETE' }) // do not leave a half-made draft behind
      throw new Error(`MailerLite could not send the campaign (HTTP ${sent.status}): ${JSON.stringify(sent.data).slice(0, 300)}`)
    }

    const fresh2 = load()
    save({
      ...fresh2,
      announced: [...fresh2.announced, ...fresh.map((i) => i.id)], // items beyond the email's cap are marked too: no backlog later
      history: [...(fresh2.history || []), { at: new Date().toISOString(), ids: chosen.map((i) => i.id), subject: plan.subject, campaignId, recipients }].slice(-50),
    })
    return finish({ ...plan, sent: true, campaignId, recipients })
  } finally {
    running = false
  }
}

export function announcementStatus() {
  const s = load()
  return {
    feedUrl: feedUrl() || null,
    canSend: canSendAnnouncements(),
    baselined: Boolean(s.baselined),
    announcedCount: s.announced?.length || 0,
    lastCheck: s.lastCheck || null,
    recent: (s.history || []).slice(-5),
  }
}

/** Runs a check shortly after start and then every ANNOUNCE_CHECK_MINUTES. */
export function startAnnouncementScheduler() {
  const minutes = Number(process.env.ANNOUNCE_CHECK_MINUTES ?? 30)
  if (!feedUrl() || !(minutes > 0)) {
    console.log('[announce] automatic checks are off (set SITE_FEED_URL, and leave ANNOUNCE_CHECK_MINUTES above 0, to turn them on)')
    return
  }
  const run = () => checkForNewContent().then((r) => console.log('[announce] check:', JSON.stringify({ ...r, html: undefined }))).catch((err) => console.error('[announce] check failed:', err.message))
  setTimeout(run, 45_000)
  setInterval(run, minutes * 60_000)
  console.log(`[announce] checking ${feedUrl()} every ${minutes} min`)
}
