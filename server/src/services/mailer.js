import nodemailer from 'nodemailer'
import { config, isMailConfigured } from '../config.js'

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

export async function sendLeadNotification({ lead, url, data, pdfBuffer }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')

  const subject = `New AI Readiness Report lead — ${lead.company || lead.email}`
  const statsLine = data?.stats
    ? `<li>Live result: cited in ${data.stats.citedCount} of ${data.stats.totalQueries} AI answers naming "${data.product?.name || ''}" — price rank ${data.stats.priceRank} of ${data.stats.sellerCount} sellers found</li>`
    : ''
  const html = `
    <h2>New AI Readiness Report request</h2>
    <p><strong>${lead.firstName} ${lead.lastName}</strong> — ${lead.company}</p>
    <ul>
      <li>Company website: ${lead.companyWebsite || '—'}</li>
      <li>Work email: ${lead.email}</li>
      <li>Job Title: ${lead.jobTitle || '—'}</li>
      <li>Scanned URL: <a href="${url}">${url}</a></li>
      ${statsLine}
    </ul>
    <p>Full report is attached as a PDF for your review before follow-up.</p>
  `

  await t.sendMail({
    from: FROM(),
    to: [config.mail.leadNotifyEmail, ...config.mail.leadCopyEmails],
    replyTo: lead.email,
    subject,
    html,
    attachments: [{ filename: 'AltiusNxt-AI-Readiness-Report.pdf', content: pdfBuffer }],
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
    bcc: config.mail.leadNotifyEmail,
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

export async function sendReportToLead({ lead, pdfBuffer }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')

  await t.sendMail({
    from: FROM(),
    to: lead.email,
    subject: 'Your AltiusNxt AI Readiness Report',
    html: `
      <p>Hi ${lead.firstName},</p>
      <p>Thanks for requesting your AI Readiness Report. It's attached as a PDF.</p>
      <p>Someone from the AltiusNxt team will be in touch shortly to walk through the findings.</p>
      <p>— AltiusNxt</p>
    `,
    attachments: [{ filename: 'AltiusNxt-AI-Readiness-Report.pdf', content: pdfBuffer }],
  })
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export async function sendContactMessage({ name, email, company, designation, message }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')
  await t.sendMail({
    from: FROM(),
    to: config.mail.leadNotifyEmail,
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
