/* Turns imported WordPress HTML into safe markup for the article page: allow-listed tags and attributes only,
   loose text wrapped in paragraphs, h1 lowered to h2, headings given anchor ids, images lazy-loaded.
   Returns { html, toc } where toc lists the h2 headings (or h3 when an article has fewer than three h2s). */
import { slugify } from './toc.js'

const TAGS = new Set(['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'b', 'em', 'i', 'br', 'img', 'figure', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote'])
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'noscript', 'svg'])
const KEEP = { a: ['href'], img: ['src', 'alt', 'width', 'height'] }
const BLOCK = new Set(['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'figure', 'table', 'blockquote', 'div', 'dl', 'dt', 'dd', 'section'])
const safeUrl = (u) => /^(https?:|mailto:|tel:|\/|#)/i.test(u.trim())

function clean(node, doc, out) {
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) { out.appendChild(doc.createTextNode(n.textContent)); return }
    if (n.nodeType !== 1) return
    const tag = n.tagName.toLowerCase()
    if (DROP.has(tag)) return
    const name = tag === 'h1' ? 'h2' : tag
    if (!TAGS.has(name)) { clean(n, doc, out); return } // unwrap div, span, dl, ...
    const el = doc.createElement(name)
    ;(KEEP[name] ?? []).forEach((a) => {
      const v = n.getAttribute(a)
      if (v && (a === 'alt' || a === 'width' || a === 'height' || safeUrl(v))) el.setAttribute(a, v)
    })
    if (name === 'a' && /^https?:/i.test(el.getAttribute('href') ?? '')) el.setAttribute('rel', 'noopener')
    if (name === 'img') { el.setAttribute('loading', 'lazy'); el.setAttribute('decoding', 'async'); if (!el.hasAttribute('alt')) el.setAttribute('alt', '') }
    clean(n, doc, el)
    out.appendChild(el)
  })
}

/* Wraps runs of loose inline content (text, strong, a, img...) that sit directly in the article in a <p>. */
function wrapLoose(root, doc) {
  let run = []
  const flush = () => {
    if (run.some((n) => n.nodeType === 1 || n.textContent.trim())) {
      const p = doc.createElement('p')
      run[0].before(p)
      run.forEach((n) => p.appendChild(n))
    }
    run = []
  }
  ;[...root.childNodes].forEach((n) => {
    if (n.nodeType === 1 && BLOCK.has(n.tagName.toLowerCase())) flush()
    else run.push(n)
  })
  flush()
}

export function sanitizeArticle(raw) {
  const src = new DOMParser().parseFromString(`<body>${raw}</body>`, 'text/html')
  const doc = document.implementation.createHTMLDocument('')
  const root = doc.createElement('div')
  clean(src.body, doc, root)
  wrapLoose(root, doc)
  root.querySelectorAll('p').forEach((p) => { if (!p.textContent.trim() && !p.querySelector('img')) p.remove() })
  const h2 = [...root.querySelectorAll('h2')]
  const heads = h2.length >= 3 ? h2 : [...root.querySelectorAll('h2, h3')]
  const used = new Set()
  const toc = []
  root.querySelectorAll('h2, h3').forEach((h) => {
    let id = slugify(h.textContent) || 'section'
    while (used.has(id)) id += '-2'
    used.add(id)
    h.id = id
    if (heads.includes(h)) toc.push({ id, text: h.textContent.trim() })
  })
  return { html: root.innerHTML, toc }
}
