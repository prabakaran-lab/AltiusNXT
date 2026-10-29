import nodemailer from 'nodemailer'
import { config, isMailConfigured } from '../config.js'
import { renderEmail, card, label, button, steps, metrics, findings, p as para } from './emailTemplate.js'
import { ringPng, shieldPng } from './emailArt.js'
import { EVENT, dayLabel, timeLabel, slotStart } from './eventBookings.js'

let transporter = null
function getTransporter() {
  if (!isMailConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.mail.user, pass: config.mail.appPassword },
      pool: true,
      maxConnections: 2,
    })
  }
  return transporter
}

const FROM = () => `"Govind · AltiusNxt" <${config.mail.user}>`

/** Tells the team about an AI Readiness Report request, the moment it is made: a notification only, with the AI readiness score. */
export async function sendLeadNotification({ lead, url, score }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')

  const subject = `New AI Readiness Report request — ${lead.company || lead.email}${score != null ? ` (score ${score}/100)` : ''}`
  const statsLine = `<li>AI readiness score: <strong>${score != null ? `${score} / 100` : 'not available'}</strong></li>`
  const html = `
    <h2>New AI Readiness Report request</h2>
    <p><strong>${esc(lead.firstName)} ${esc(lead.lastName)}</strong> — ${esc(lead.company)}</p>
    <ul>
      <li>Work email: ${esc(lead.email)}</li>
      <li>Scanned URL: <a href="${esc(url)}">${esc(url)}</a></li>
      ${statsLine}
    </ul>
    <p>The visitor was told our team will be reaching out shortly, and has received a confirmation email.
    Reply to this email to reach them at <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>.</p>
  `

  await t.sendMail({
    from: FROM(),
    to: [config.mail.leadNotifyEmail, ...config.mail.leadCopyEmails],
    replyTo: lead.email,
    subject,
    html,
  })
}

/**
 * Cold-outreach send: the report goes directly to a prospect who has not opted in, so the body
 * stays short and factual and always carries an honor-on-request unsubscribe line (the attached
 * report repeats it too). Govind is bcc'd so replies and bounces are visible without being the
 * reply-to address — keeping the recipient's own path to unsubscribe a plain reply.
 */
export async function sendOutreachReport({ to, contactName, company, productName, pdfBuffer, filename, senderName, senderEmail, unsubscribeEmail }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')

  const firstName = (contactName || '').split(' ')[0] || 'there'
  await t.sendMail({
    from: FROM(),
    to,
    bcc: [config.mail.leadNotifyEmail, ...config.mail.leadCopyEmails],
    replyTo: senderEmail || config.mail.leadNotifyEmail,
    subject: `${company} — how AI search answers for ${productName}`,
    html: `
      <p>Hi ${firstName},</p>
      <p>We ran a quick AI-discoverability check on one of ${company}'s product listings (${productName}) — the attached report shows what ChatGPT, Claude and Gemini said when asked the way buyers actually search, and what it would take to change that.</p>
      <p>No proposal or commitment needed to read it — happy to walk through it live if useful.</p>
      <p>— ${senderName || 'Govind'}, AltiusNxt Technologies</p>
      <p style="font-size:12px;color:#888;margin-top:24px;">${unsubscribeEmail ? `If you'd rather not hear from us again, reply "unsubscribe" to ${unsubscribeEmail} and we will stop.` : ''}</p>
    `,
    attachments: [{ filename: filename || 'AltiusNxt-AI-Readiness-Report.pdf', content: pdfBuffer }],
  })
}

// "AIRCON DUCT FLAT BEND 90 DEG 80MM" -> "Aircon Duct Flat Bend 90 Deg 80MM". Names that are already mixed case are left alone.
function tidyName(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim()
  const letters = n.replace(/[^A-Za-z]/g, '')
  if (letters.length < 4 || n !== n.toUpperCase()) return n
  return n.split(' ').map((w) => (/\d/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ')
}
const ellipsis = (s, max) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s)

export async function sendReportToLead({ lead, pdfBuffer, data }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')

  const first = String(lead.firstName || '').trim() || 'there'
  const product = tidyName(data?.product?.name)
  const shortProduct = ellipsis(product, 64)
  const cited = Number(data?.stats?.citedCount)
  const asked = Number(data?.stats?.totalQueries)
  const hasCited = Number.isFinite(cited) && Number.isFinite(asked) && asked > 0
  const score = Number(data?.scorecard?.overall)
  const hasScore = Number.isFinite(score)
  const sellers = Number(data?.stats?.sellerCount)
  const rankLabel = String(data?.stats?.priceRank || '')
  const hasRank = /lowest$/i.test(rankLabel) && Number.isFinite(sellers) && sellers >= 2
  const gaps = (Array.isArray(data?.gaps) ? data.gaps : []).map((g) => String(g?.title || '').trim()).filter(Boolean).slice(0, 3)
  const monthYear = data?.methodologyMonthYear || ''
  const sender = config.outreach.senderName || 'The AltiusNxt team'
  const senderTitle = config.outreach.senderTitle || ''
  const replyTo = config.outreach.senderEmail || config.mail.user
  const FONT = "'Segoe UI',Helvetica,Arial,sans-serif"

  const numbers = []
  if (hasScore) numbers.push([`${score}<span style="font-size:15px;color:#9aa8bd;font-weight:700"> / 100</span>`, 'AI readiness score'])
  if (hasCited) numbers.push([`${cited}<span style="font-size:15px;color:#9aa8bd;font-weight:700"> of ${asked}</span>`, 'AI searches that named you'])
  if (hasRank) numbers.push([esc(rankLabel.replace(/ lowest$/i, '')), `lowest price among ${sellers} sellers`])

  const found = gaps.length ? `${label('What stood out')}${findings(gaps)}` : ''

  const attachmentRow = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;border:1px solid #e3eaf4;border-radius:12px"><tr>
      <td width="64" align="center" style="padding:14px 0 14px 14px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" width="44" height="52" bgcolor="#e5483a" style="width:44px;height:52px;border-radius:7px;background:#e5483a;font:800 12px/52px ${FONT};color:#ffffff;letter-spacing:.06em">PDF</td></tr></table></td>
      <td style="padding:14px 18px 14px 12px"><div style="font:700 14.5px/1.3 ${FONT};color:#0b1f3a">AltiusNxt-AI-Readiness-Report.pdf</div><div style="font:400 12.5px/1.5 ${FONT};color:#7b8798;margin-top:2px">Six pages${monthYear ? ` &middot; ${esc(monthYear)}` : ''} &middot; attached</div></td>
    </tr></table>`

  const intro = `We tested ${product ? `<strong style="color:#0b1f3a">${esc(shortProduct)}</strong>` : 'your product page'} on ChatGPT, Claude, Gemini and Perplexity${hasCited ? ` with ${asked} buyer-style searches` : ''}, compared its price with other sellers, and scored the page against our 15-point AI-readiness scorecard. The full six-page report is attached.`

  // The hero shows this report's own score when there is one, otherwise how many AI searches named the seller.
  const hero = hasScore ? { png: await ringPng({ value: score, max: 100, caption: 'OUT OF 100' }), size: 150 }
    : hasCited ? { png: await ringPng({ value: cited, max: asked, caption: `OF ${asked} SEARCHES` }), size: 150 } : null

  const { html, attachments } = renderEmail({
    hero,
    preheader: hasCited ? `Named in ${cited} of ${asked} AI searches${hasScore ? `, readiness score ${score} of 100` : ''}. Your six-page report is attached.` : 'Your six-page AI Readiness Report is attached as a PDF.',
    kicker: `AI Readiness Report${monthYear ? ` · ${monthYear}` : ''}`,
    heading: product ? `How AI sees ${shortProduct}` : `${first}, your report is ready`,
    reason: 'You are getting this email because you requested a report on our website.',
    bodyHtml: `
      ${para(`Hi ${esc(first)},`)}
      ${para(intro)}
      ${numbers.length ? metrics(numbers) : ''}
      ${found}
      ${attachmentRow}
      ${para('<strong style="color:#0b1f3a">Where to start:</strong> page 2 shows which sellers each AI engine named when buyers asked, and page 3 lists the five gaps on your page, ranked by impact.')}
      ${para('If it helps, one of our product data engineers can walk you through the findings and what to change first. There is no sales pressure.')}
      ${button('Book a walkthrough', `mailto:${replyTo}?subject=${encodeURIComponent('Walkthrough of my AI Readiness Report')}`)}
      ${para(`Regards,<br><strong style="color:#0b1f3a">${esc(sender)}</strong>${senderTitle ? `<br><span style="color:#5b6b82">${esc(senderTitle)}, AltiusNxt</span>` : '<br><span style="color:#5b6b82">AltiusNxt</span>'}`)}`,
  })

  await t.sendMail({
    from: FROM(),
    to: lead.email,
    subject: product ? `Your AI Readiness Report: ${shortProduct}` : 'Your AltiusNxt AI Readiness Report',
    text: `Hi ${first},\n\nWe tested ${product || 'your product page'} on ChatGPT, Claude, Gemini and Perplexity${hasCited ? ` with ${asked} buyer-style searches` : ''}.\n${hasScore ? `AI readiness score: ${score} / 100\n` : ''}${hasCited ? `Named in ${cited} of ${asked} AI searches\n` : ''}${hasRank ? `Price: ${rankLabel} among ${sellers} sellers\n` : ''}${gaps.length ? `\nWhat stood out:\n${gaps.map((g) => `- ${g}`).join('\n')}\n` : ''}\nThe full six-page report is attached. Start with page 2 (who the AI engines named) and page 3 (the five gaps, ranked by impact).\n\nIf you would like a walkthrough, just reply to this email.\n\nRegards,\n${sender}${senderTitle ? `\n${senderTitle}, AltiusNxt` : '\nAltiusNxt'}`,
    html,
    attachments: [{ filename: 'AltiusNxt-AI-Readiness-Report.pdf', content: pdfBuffer }, ...attachments],
  })
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export async function sendContactMessage({ name, email, company, designation, message }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')
  await t.sendMail({
    from: FROM(),
    to: [config.mail.leadNotifyEmail, ...config.mail.leadCopyEmails],
    replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
    subject: `Website contact: ${name}${company ? `, ${company}` : ''}`,
    html: `
      <h2>New message from the website contact form</h2>
      <ul>
        <li><strong>Name:</strong> ${esc(name)}</li>
        <li><strong>Email:</strong> ${esc(email)}</li>
        ${company ? `<li><strong>Company:</strong> ${esc(company)}</li>` : ''}
        ${designation ? `<li><strong>Designation:</strong> ${esc(designation)}</li>` : ''}
      </ul>
      <p style="white-space:pre-wrap">${esc(message)}</p>
    `,
  })
  // short acknowledgement to the sender
  await t.sendMail({
    from: FROM(),
    to: email,
    subject: 'We received your message | AltiusNxt',
    html: `<p>Hi ${esc(name)},</p><p>Thanks for contacting AltiusNxt. A Product Data Expert will reply to you shortly.</p><p>AltiusNxt</p>`,
  })
}

/** Thanks the visitor for an AI Readiness Report request and tells them the team will be in touch shortly. */
export async function sendReportRequestAck({ lead, url, score }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')
  const FONT = "'Segoe UI',Helvetica,Arial,sans-serif"
  const first = String(lead.firstName || '').trim() || 'there'
  const hasScore = Number.isFinite(score)
  const sender = config.outreach.senderName
  const senderTitle = config.outreach.senderTitle
  let host = ''
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* shown as the full address */ }

  const { html, attachments } = renderEmail({
    hero: hasScore ? { png: await ringPng({ value: score, max: 100, caption: 'OUT OF 100' }), size: 150 } : { png: await shieldPng(), size: 150 },
    preheader: 'We have received your AI Readiness Report request. Our team will be reaching out to you shortly.',
    kicker: 'AI Readiness Report',
    heading: 'Thank you, we have received your request',
    reason: 'You are getting this email because you requested an AI Readiness Report on our website.',
    bodyHtml: `
      ${para(`Hi ${esc(first)},`)}
      ${para(`Thank you for requesting an AI Readiness Report${lead.company ? ` for <strong style="color:#0b1f3a">${esc(lead.company)}</strong>` : ''}. We have received your request, and a member of our product data team will be reaching out to you shortly.`)}
      ${card(`
        ${label('Your request')}
        <div style="font:600 14.5px/1.5 ${FONT};color:#0b1f3a;word-break:break-all"><a href="${esc(url)}" style="color:#e8590c;text-decoration:none">${esc(host || url)}</a></div>
        ${hasScore ? `<div style="margin-top:10px;font:400 13.5px/1.5 ${FONT};color:#5b6b82">AI readiness score from your quick scan: <strong style="color:#0b1f3a">${score} / 100</strong></div>` : ''}`)}
      ${label('What happens next')}
      ${steps([
        ['Our specialists review your page', 'A product data engineer looks at how ChatGPT, Claude, Gemini and Perplexity read and recommend your product.'],
        ['We prepare your findings', 'The gaps that hold your page back in AI search, and the fixes in priority order.'],
        ['We reach out to you', 'Our team will contact you at this email address to share your report and answer any questions.'],
      ])}
      ${para('If you have any questions in the meantime, simply reply to this email.')}
      ${para(`Kind regards,<br><strong style="color:#0b1f3a">${esc(sender)}</strong>${senderTitle ? `<br><span style="color:#5b6b82">${esc(senderTitle)}, AltiusNxt</span>` : '<br><span style="color:#5b6b82">AltiusNxt</span>'}`)}`,
  })

  await t.sendMail({
    from: FROM(),
    to: lead.email,
    replyTo: config.outreach.senderEmail || config.mail.leadNotifyEmail,
    subject: 'We have received your AI Readiness Report request | AltiusNxt',
    text: `Hi ${first},\n\nThank you for requesting an AI Readiness Report${lead.company ? ` for ${lead.company}` : ''}. We have received your request, and a member of our product data team will be reaching out to you shortly.\n\nProduct page: ${url}${hasScore ? `\nAI readiness score from your quick scan: ${score} / 100` : ''}\n\nIf you have any questions in the meantime, simply reply to this email.\n\nKind regards,\n${sender}${senderTitle ? `\n${senderTitle}, AltiusNxt` : '\nAltiusNxt'}`,
    html,
    attachments,
  })
}

/* ---- B2B eCommerce World 2026: live audit bookings ---- */

const slotText = (b) => `${dayLabel(b.date)}, 2026 at ${timeLabel(b.time)} ${EVENT.tzLabel}`

/** A calendar invite (.ics) for the booked 30-minute slot, so the visitor can add it to their calendar in one click. */
function bookingIcs(b) {
  const start = slotStart(b.date, b.time)
  const end = new Date(start.getTime() + EVENT.slotMinutes * 60000)
  const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const line = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AltiusNxt//Live Audit//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${b.id}@altiusnxt.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${line(`AltiusNxt live AI-readiness audit (${EVENT.booth})`)}`,
    `LOCATION:${line(`${EVENT.name}, ${EVENT.booth}, ${EVENT.venue}`)}`,
    `DESCRIPTION:${line(`Your live audit with AltiusNxt at ${EVENT.name}. Reference ${b.ref}. Website: ${b.website}`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

/** Tells the team about a new live audit booking. */
export async function sendEventBookingNotification({ booking: b, remaining }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')
  const html = `
    <h2>New live audit booking: ${esc(EVENT.name)}</h2>
    <p><strong>${esc(b.name)}</strong>${b.jobTitle ? ` (${esc(b.jobTitle)})` : ''} at <strong>${esc(b.company)}</strong></p>
    <ul>
      <li>Slot: <strong>${esc(slotText(b))}</strong> at ${esc(EVENT.booth)}, ${esc(EVENT.venue)}</li>
      <li>Work email: <a href="mailto:${esc(b.email)}">${esc(b.email)}</a></li>
      <li>Website: <a href="${esc(b.website)}">${esc(b.website)}</a></li>
      <li>Reference: ${esc(b.ref)}</li>
      <li>Slots left: ${remaining} of 20</li>
    </ul>
    <p>The visitor has received a confirmation email with a calendar invite. Reply to this email to reach them.</p>`
  await t.sendMail({
    from: FROM(),
    to: [config.mail.leadNotifyEmail, ...config.mail.leadCopyEmails],
    replyTo: b.email,
    subject: `Live audit booked — ${b.company}, ${dayLabel(b.date)} ${timeLabel(b.time)} ${EVENT.tzLabel} (${remaining} of 20 left)`,
    html,
  })
}

/** Confirms a live audit booking to the visitor, with the calendar invite attached. */
export async function sendEventBookingConfirmation({ booking: b }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')
  const FONT = "'Segoe UI',Helvetica,Arial,sans-serif"
  const first = String(b.name || '').trim().split(/\s+/)[0] || 'there'
  const row = (k, v) => `<tr><td style="padding:6px 0;font:600 12px/1.4 ${FONT};letter-spacing:.06em;text-transform:uppercase;color:#7b8798;width:120px">${k}</td><td style="padding:6px 0;font:600 14.5px/1.5 ${FONT};color:#0b1f3a">${v}</td></tr>`
  const { html, attachments } = renderEmail({
    hero: { png: await shieldPng(), size: 150 },
    preheader: `Your live audit is booked for ${slotText(b)} at ${EVENT.booth}, ${EVENT.venue}.`,
    kicker: `${EVENT.name} · ${EVENT.booth}`,
    heading: 'Your live audit is booked',
    reason: `You are getting this email because you booked a live audit with AltiusNxt for ${EVENT.name}.`,
    bodyHtml: `
      ${para(`Hi ${esc(first)},`)}
      ${para(`Thank you for booking a live AI-readiness audit with AltiusNxt at <strong style="color:#0b1f3a">${esc(EVENT.name)}</strong>. Your slot is confirmed, and we look forward to meeting you at the booth.`)}
      ${card(`
        ${label('Your booking')}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${row('When', esc(slotText(b)))}
          ${row('Where', `${esc(EVENT.booth)}, ${esc(EVENT.venue)}`)}
          ${row('Duration', `${EVENT.slotMinutes} minutes`)}
          ${row('Website', esc(b.website))}
          ${row('Reference', esc(b.ref))}
        </table>`)}
      ${label('What to expect')}
      ${steps([
        ['We audit your site live', 'A product data engineer checks how ChatGPT, Claude, Gemini and Perplexity find, read and recommend your products.'],
        ['You see the gaps', 'Missing attributes, weak product data and what stops AI from recommending you.'],
        ['You leave with next steps', 'The fixes that matter most, in priority order.'],
      ])}
      ${para('The calendar invite is attached. If you need to change your slot, simply reply to this email.')}
      ${para(`Kind regards,<br><strong style="color:#0b1f3a">${esc(config.outreach.senderName)}</strong>${config.outreach.senderTitle ? `<br><span style="color:#5b6b82">${esc(config.outreach.senderTitle)}, AltiusNxt</span>` : '<br><span style="color:#5b6b82">AltiusNxt</span>'}`)}`,
  })
  await t.sendMail({
    from: FROM(),
    to: b.email,
    replyTo: config.outreach.senderEmail || config.mail.leadNotifyEmail,
    subject: `Your live audit is booked: ${dayLabel(b.date)} at ${timeLabel(b.time)} ${EVENT.tzLabel} | ${EVENT.name}`,
    text: `Hi ${first},\n\nThank you for booking a live AI-readiness audit with AltiusNxt at ${EVENT.name}. Your slot is confirmed.\n\nWhen: ${slotText(b)}\nWhere: ${EVENT.booth}, ${EVENT.venue}\nDuration: ${EVENT.slotMinutes} minutes\nWebsite: ${b.website}\nReference: ${b.ref}\n\nThe calendar invite is attached. If you need to change your slot, simply reply to this email.\n\nKind regards,\n${config.outreach.senderName}\nAltiusNxt`,
    html,
    attachments: [...attachments, { filename: 'altiusnxt-live-audit.ics', content: bookingIcs(b), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }],
  })
}

export async function sendOtpEmail({ to, name, code }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')
  const first = String(name || '').trim().split(/\s+/)[0] || 'there'
  const FONT = "'Segoe UI',Helvetica,Arial,sans-serif"
  const { html, attachments } = renderEmail({
    hero: { png: await shieldPng(), size: 150 },
    preheader: 'Confirm your email to get your AI Readiness Report. The code is valid for 10 minutes.',
    kicker: 'Email verification',
    heading: 'Confirm your email',
    reason: 'You are getting this email because someone entered this address on our website to get an AI Readiness Report.',
    bodyHtml: `
      ${para(`Hi ${esc(first)},`)}
      ${para('Thanks for asking for your AI Readiness Report. Enter this code on the page to confirm it is really you.')}
      ${card(`
        ${label('Your verification code')}
        <div style="font:800 46px/1.1 'Courier New',Courier,monospace;letter-spacing:12px;color:#0b1f3a">${esc(code)}</div>
        <div style="margin-top:12px;font:600 12.5px/1.4 ${FONT};color:#7b8798">Valid for 10 minutes &nbsp;&middot;&nbsp; works once</div>`)}
      ${label('What happens next')}
      ${steps([
        ['Enter the code on the page', 'It takes a few seconds.'],
        ['We receive your request', 'Our product data team reviews how AI engines read your product page.'],
        ['We reach out to you', 'Our team will be in touch shortly at this email address with your report.'],
      ])}
      <p style="margin:0 0 10px;font:400 13px/1.6 ${FONT};color:#7b8798">Did not ask for this? You can safely ignore this email. Nothing happens unless the code is entered.</p>`,
  })
  await t.sendMail({
    from: FROM(),
    to,
    subject: 'Confirm your email for your AltiusNxt AI Readiness Report',
    text: `Hi ${first},\n\nYour AltiusNxt verification code is ${code}. It is valid for 10 minutes and works once.\n\nEnter it on the page to confirm your email and request your AI Readiness Report. Our team will then be in touch shortly.\n\nIf you did not ask for it, you can ignore this email.\n\nAltiusNxt`,
    html,
    attachments,
  })
}
