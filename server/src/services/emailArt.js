import sharp from 'sharp'

/* Small illustrations drawn per email (PNG, attached inline), so the hero shows this person's own number.
   Drawn at 2x (320 px) and shown at 160 px so it stays sharp on phones. */

const SIZE = 320
const FONT = "Segoe UI, Arial, Helvetica, sans-serif"

const glow = `
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff6a1a" stop-opacity=".38"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb27d"/><stop offset="1" stop-color="#ff6a1a"/></linearGradient>
  </defs>
  <circle cx="160" cy="160" r="156" fill="url(#g)"/>`

/** A ring that fills to value/max with the number in the middle. */
export async function ringPng({ value, max = 100, caption = '' }) {
  const v = Math.max(0, Math.min(max, Number(value)))
  const r = 112
  const c = 2 * Math.PI * r
  const dash = (v / max) * c
  const big = String(Math.round(v))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    ${glow}
    <circle cx="160" cy="160" r="${r}" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.16)" stroke-width="20"/>
    <circle cx="160" cy="160" r="${r}" fill="none" stroke="url(#a)" stroke-width="20" stroke-linecap="round" stroke-dasharray="${dash} ${c}" transform="rotate(-90 160 160)"/>
    <text x="160" y="${caption ? 176 : 188}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${big.length > 2 ? 66 : 84}" fill="#ffffff">${big}</text>
    ${caption ? `<text x="160" y="212" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="22" fill="#9fb2cc" letter-spacing="1">${caption}</text>` : ''}
  </svg>`
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}

/** A shield with a check mark, for the verification email. */
export async function shieldPng() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    ${glow}
    <circle cx="160" cy="160" r="118" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
    <circle cx="160" cy="160" r="92" fill="rgba(255,255,255,.04)" stroke="rgba(255,138,77,.35)" stroke-width="2" stroke-dasharray="6 8"/>
    <path d="M160 78 L222 100 V158 C222 198 194 226 160 242 C126 226 98 198 98 158 V100 Z" fill="url(#a)"/>
    <path d="M160 78 L222 100 V158 C222 198 194 226 160 242 Z" fill="#000" fill-opacity=".10"/>
    <path d="M132 160 L152 180 L190 138" fill="none" stroke="#ffffff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}
