import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { parseHTML } from 'linkedom'
import App from './App.jsx'
import { startCollectingHead, getCollectedHead } from './ssrHead.js'

// A small handful of components (the resource-article HTML sanitizer, specifically) use DOMParser /
// document.implementation to parse and rebuild article markup — real, standard DOM calls the browser
// always provided, just never exercised in Node before now. Polyfilling them here (not touching that
// component's own code at all) is the fix: the exact same logic runs unchanged on both the client and
// during this build-time render.
if (typeof globalThis.DOMParser === 'undefined') {
  // linkedom's own DOMParser class returns an empty, disconnected document for a bare `<body>…</body>`
  // fragment (no <html>/<head> around it) — exactly what sanitize.js passes. A real browser implicitly
  // wraps a fragment like that in a full document when parsing as 'text/html'; this does the same
  // before handing off to linkedom's (otherwise fully working) parseHTML.
  globalThis.DOMParser = class DOMParser {
    parseFromString(html) {
      const full = /<html[\s>]/i.test(html) ? html : `<!doctype html><html><head></head>${/<body[\s>]/i.test(html) ? html : `<body>${html}</body>`}</html>`
      return parseHTML(full).document
    }
  }
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = { implementation: { createHTMLDocument: () => parseHTML('<!doctype html><html><head></head><body></body></html>').document } }
}

/**
 * Renders one route to an HTML string for the build-time prerender (scripts/prerender.mjs). Not part
 * of the client bundle — only ever imported from that Node script, after `vite build --ssr` builds
 * this file as its own separate bundle. The exact same App component tree the browser uses; nothing
 * here is a different "server version" of any page.
 */
export function render(url) {
  startCollectingHead()
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
  return { html, head: getCollectedHead() }
}
