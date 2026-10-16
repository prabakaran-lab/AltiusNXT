import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/* One branded layout for the emails visitors receive (verification code, report delivery).
   Table-based HTML with inline styles so it renders the same in Gmail, Outlook and Apple Mail.
   Images are attached inline (cid:) because Gmail blocks data: images and cannot reach a localhost image.

   Layout: white logo bar -> navy hero (kicker + heading, with a drawn illustration on the right) with an orange rule
   -> body -> credibility strip -> footer. */

const here = dirname(fileURLToPath(import.meta.url))
const LOGO_PATH = resolve(here, '../../assets/altiusnxt_logo_email.png')
export const LOGO_CID = 'altiusnxt-logo@altiusnxt'
const HERO_CID = 'altiusnxt-hero@altiusnxt'

const NAVY = '#0b1f3a'
const NAVY_DEEP = '#07162b'
const ORANGE = '#ff6a1a'
const ORANGE_DK = '#e85a0c'
const SITE = 'https://www.altiusnxt.com'
const FONT = "'Segoe UI',Helvetica,Arial,sans-serif"

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const inlineLogo = () => ({ filename: 'altiusnxt-logo.png', path: LOGO_PATH, cid: LOGO_CID, contentDisposition: 'inline' })

/** Body paragraph. */
export const p = (html) => `<p style="margin:0 0 16px;font:400 15.5px/1.7 ${FONT};color:#33425a">${html}</p>`

/** A small label above a section ("WHAT STOOD OUT"). */
export const label = (text) => `<div style="font:700 11px/1 ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${ORANGE_DK};margin:0 0 12px">${esc(text)}</div>`

/** Bulletproof call-to-action button. */
export const button = (text, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr>
    <td bgcolor="${ORANGE}" style="border-radius:12px;background:${ORANGE};box-shadow:0 8px 18px rgba(255,106,26,.35)"><a href="${esc(href)}" style="display:inline-block;padding:16px 32px;font:700 15px ${FONT};color:#ffffff;text-decoration:none;border-radius:12px">${esc(text)}&nbsp;&rarr;</a></td>
  </tr></table>`

/** Numbered steps, one per row. items: [[title, detail], ...] */
export const steps = (items) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 20px">
    ${items.map(([t, d], i) => `
    <tr>
      <td width="44" valign="top" style="padding:0 0 16px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" width="32" height="32" bgcolor="${i === 0 ? ORANGE : '#eef3fa'}" style="width:32px;height:32px;border-radius:16px;background:${i === 0 ? ORANGE : '#eef3fa'};font:800 13px/32px ${FONT};color:${i === 0 ? '#ffffff' : NAVY}">${i + 1}</td></tr></table></td>
      <td valign="top" style="padding:3px 0 16px"><div style="font:700 15px/1.3 ${FONT};color:${NAVY}">${esc(t)}</div><div style="font:400 13.5px/1.55 ${FONT};color:#6b7a90;margin-top:2px">${esc(d)}</div></td>
    </tr>`).join('')}
  </table>`

/** A tinted card with an orange edge, used for the verification code. */
export const card = (inner, accent = ORANGE) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 24px"><tr>
    <td style="border-radius:16px;border:1px solid #dfe7f2;background:#f6f9fd;border-left:5px solid ${accent};padding:22px 26px">${inner}</td>
  </tr></table>`

/** Up to three headline numbers as separate tiles. items: [[value, caption], ...] */
export const metrics = (items) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px -6px 22px;border-collapse:separate;border-spacing:6px 0;width:calc(100% + 12px)"><tr>
    ${items.map(([v, c]) => `
    <td width="${Math.floor(100 / items.length)}%" valign="top" align="center" style="padding:18px 8px 16px;border-radius:14px;background:#f6f9fd;border:1px solid #dfe7f2;border-top:4px solid ${ORANGE}">
      <div style="font:800 28px/1.1 ${FONT};color:${NAVY};letter-spacing:-.01em">${v}</div>
      <div style="font:600 12px/1.4 ${FONT};color:#5b6b82;margin-top:7px">${c}</div>
    </td>`).join('')}
  </tr></table>`

/** A numbered list of findings inside a tinted card. */
export const findings = (items) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px"><tr><td style="border-radius:16px;background:#fff7f2;border:1px solid #ffe0cc;padding:18px 22px 6px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${items.map((t, i) => `<tr>
        <td width="34" valign="top" style="padding:0 0 13px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" width="24" height="24" bgcolor="${ORANGE}" style="width:24px;height:24px;border-radius:12px;background:${ORANGE};font:800 12px/24px ${FONT};color:#ffffff">${i + 1}</td></tr></table></td>
        <td valign="top" style="padding:1px 0 13px;font:600 14.5px/1.5 ${FONT};color:${NAVY}">${esc(t)}</td>
      </tr>`).join('')}
    </table>
  </td></tr></table>`

/** The credibility strip: three confirmed facts, plus the certifications. */
const strip = () => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    ${[['20+', 'Years of experience'], ['15M+', 'Products enriched'], ['500+', 'Distributors']].map(([n, l], i) => `
    <td align="center" style="padding:8px 4px;${i ? 'border-left:1px solid #1d3354;' : ''}"><div style="font:800 26px/1.1 ${FONT};color:${ORANGE}">${n}</div><div style="font:600 11px/1.4 ${FONT};color:#9fb2cc;letter-spacing:.07em;text-transform:uppercase;margin-top:4px">${l}</div></td>`).join('')}
  </tr></table>
  <div style="text-align:center;margin-top:16px;font:600 11.5px/1.5 ${FONT};color:#6f84a3;letter-spacing:.04em">ISO 9001 &nbsp;&middot;&nbsp; ISO 27001 &nbsp;&middot;&nbsp; Certified by T&Uuml;V Austria</div>`

/**
 * @param hero optional illustration: { png: Buffer, size: 150 } shown on the right of the navy hero.
 */
export function renderEmail({ preheader = '', kicker = '', heading, bodyHtml, hero, reason = 'You are getting this email because you asked for it on our website.' }) {
  const text = `
        ${kicker ? `<div style="font:700 11px/1 ${FONT};letter-spacing:.18em;text-transform:uppercase;color:#ffa266;margin-bottom:14px">${esc(kicker)}</div>` : ''}
        <h1 style="margin:0;font:800 29px/1.22 ${FONT};color:#ffffff;letter-spacing:-.01em">${esc(heading)}</h1>`
  const heroHtml = hero
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
         <td valign="middle" style="padding-right:14px">${text}</td>
         <td valign="middle" width="${hero.size}" align="right"><img src="cid:${HERO_CID}" width="${hero.size}" height="${hero.size}" alt="" style="display:block;border:0;outline:none"></td>
       </tr></table>`
    : text

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#e9eef5">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#e9eef5"><tr><td align="center" style="padding:30px 14px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="width:100%;max-width:620px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 22px 48px rgba(11,31,58,.16)">

      <tr><td style="padding:24px 36px 20px;background:#ffffff">
        <a href="${SITE}" style="text-decoration:none"><img src="cid:${LOGO_CID}" width="150" alt="AltiusNxt" style="display:block;border:0;outline:none;height:auto;max-width:150px"></a>
      </td></tr>

      <tr><td bgcolor="${NAVY}" style="background:${NAVY};background-image:linear-gradient(135deg,${NAVY} 0%,#16346a 100%);padding:34px 36px 34px;border-bottom:4px solid ${ORANGE}">
        ${heroHtml}
      </td></tr>

      <tr><td style="padding:32px 36px 12px">
        ${bodyHtml}
      </td></tr>

      <tr><td bgcolor="${NAVY_DEEP}" style="background:${NAVY_DEEP};padding:28px 36px 6px">${strip()}</td></tr>
      <tr><td bgcolor="${NAVY_DEEP}" style="background:${NAVY_DEEP};padding:18px 36px 32px;font:400 12.5px/1.7 ${FONT};color:#8ea3c0;text-align:center">
        <strong style="color:#ffffff">AltiusNxt Technologies</strong><br>
        Industrial product data, engineered for AI search<br>
        Farmington Hills, MI, USA &nbsp;&middot;&nbsp; Coimbatore, India &nbsp;&middot;&nbsp; <a href="${SITE}" style="color:#ffa266;text-decoration:none">altiusnxt.com</a>
        <div style="margin-top:14px;font-size:11.5px;color:#6f84a3">${esc(reason)}</div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`

  const attachments = [inlineLogo()]
  if (hero) attachments.push({ filename: 'hero.png', content: hero.png, cid: HERO_CID, contentDisposition: 'inline' })
  return { html, attachments }
}
