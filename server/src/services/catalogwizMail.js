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

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** Tells the team who asked for a CatalogWiz enrichment demo, and for which page. */
export async function sendDemoRequestNotification({ lead, url }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')

  await t.sendMail({
    from: `"AltiusNxt CatalogWiz demo" <${config.mail.user}>`,
    to: config.mail.leadNotifyEmail,
    replyTo: lead.email,
    subject: `New CatalogWiz enrichment demo request — ${lead.company}`,
    html: `
      <h2>New CatalogWiz enrichment demo request</h2>
      <p><strong>${esc(lead.name)}</strong> — ${esc(lead.company)}</p>
      <ul>
        <li>Email: <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></li>
        <li>Phone: ${esc(lead.phone)}</li>
        <li>Product page submitted: <a href="${esc(url)}">${esc(url)}</a></li>
        <li>Requested: ${esc(new Date().toUTCString())}</li>
      </ul>
      <p>The live enrichment demo for this page is running for them now.</p>
    `,
  })
}

/** Tells the team about a new newsletter subscriber (a short note, no marketing content). */
export async function sendSubscriberNotification({ email, source, provider }) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server (GMAIL_USER / GMAIL_APP_PASSWORD)')

  await t.sendMail({
    from: `"AltiusNxt website" <${config.mail.user}>`,
    to: config.mail.leadNotifyEmail,
    subject: `New newsletter subscriber — ${email}`,
    html: `
      <h2>New newsletter subscriber</h2>
      <ul>
        <li>Email: <a href="mailto:${esc(email)}">${esc(email)}</a></li>
        <li>Signed up on: ${esc(source || 'website')}</li>
        <li>Added to: ${esc(provider === 'mailerlite' ? 'MailerLite' : 'the local list (server/subscribers.json); the email provider is not connected yet')}</li>
        <li>Time: ${esc(new Date().toUTCString())}</li>
      </ul>
    `,
  })
}
