/**
 * Collects <head> data (title, description, canonical, Open Graph, JSON-LD) during build-time
 * prerendering only — `scripts/prerender.mjs` calls startCollectingHead() before rendering each
 * route, then reads the result straight after react-dom/server finishes that page, and injects it
 * into that route's static HTML.
 *
 * In the browser this is always a no-op: `current` is never initialized there (nothing ever calls
 * startCollectingHead() client-side), so every function below just returns immediately. The existing
 * useEffect-based DOM mutation in PageSeo.jsx / useDocumentMeta.js / ResourceDetail.jsx is completely
 * unchanged and still does the real work once the page is interactive — this module only adds a
 * second, render-time (not effect-time) place for the exact same data to land, which is the one
 * thing useEffect can't do during server rendering.
 */
let current = null

export function startCollectingHead() {
  current = { title: '', description: '', keywords: '', canonical: '', ogType: 'website', ogImage: '', structuredData: [] }
  return current
}

export function getCollectedHead() {
  return current
}

export function setHead(partial) {
  if (!current) return
  Object.assign(current, partial)
}

export function addStructuredData(data) {
  if (!current || !data) return
  current.structuredData.push(data)
}
