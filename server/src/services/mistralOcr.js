import { config, isMistralConfigured } from '../config.js'

const OCR_ENDPOINT = 'https://api.mistral.ai/v1/ocr'

/**
 * Runs Mistral's OCR model against a document or image reachable by URL and returns its
 * extracted text, concatenated across pages. Used for content a plain HTML text scrape can't
 * reach: PDF datasheets/spec sheets linked from a product page, and diagram/spec-table images
 * that carry their data as pixels rather than markup. Never throws — OCR is a best-effort
 * enrichment, not something that should take down the rest of the report if one asset fails
 * (wrong file type, dead link, OCR quota) — callers get '' back and keep going.
 */
async function runOcr(assetUrl, kind) {
  if (!isMistralConfigured()) return ''
  try {
    const res = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.mistral.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: kind === 'image'
          ? { type: 'image_url', image_url: assetUrl }
          : { type: 'document_url', document_url: assetUrl },
      }),
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) {
      console.warn(`Mistral OCR failed for ${assetUrl} (${res.status})`)
      return ''
    }
    const data = await res.json()
    const pages = Array.isArray(data?.pages) ? data.pages : []
    return pages.map((p) => p?.markdown || '').join('\n').trim()
  } catch (err) {
    console.warn(`Mistral OCR failed for ${assetUrl}: ${err.message}`)
    return ''
  }
}

export const ocrDocument = (url) => runOcr(url, 'document')
export const ocrImage = (url) => runOcr(url, 'image')

// Link text/filename/alt cues that mark a candidate worth the OCR cost — kept deliberately
// narrow (spec/datasheet/diagram language) rather than OCR-ing every PDF or image on the page,
// since most are unrelated (brochures, logos, banners) and OCR has real per-call cost.
const PDF_CUE_RE = /(datasheet|spec(ification)?s?[-_ ]?sheet|product[-_ ]?manual|technical[-_ ]?data|drawing)/i
const IMAGE_CUE_RE = /(spec(ification)?s?|diagram|dimension|chart|schematic|drawing)/i

/**
 * Scans a page's raw HTML for PDF datasheet links and diagram/spec-table images worth OCR-ing,
 * capped to a small number of each to bound cost and latency. Resolves relative URLs against
 * the page's own URL.
 */
export function findOcrCandidates(html, pageUrl) {
  const base = (() => {
    try { return new URL(pageUrl) } catch { return null }
  })()
  const resolve = (href) => {
    if (!href) return null
    try { return new URL(href, base || undefined).toString() } catch { return null }
  }

  const pdfLinks = new Set()
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"']+\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, innerText] = m
    const linkContext = `${href} ${innerText}`.replace(/<[^>]+>/g, ' ')
    if (PDF_CUE_RE.test(linkContext)) {
      const resolved = resolve(href)
      if (resolved) pdfLinks.add(resolved)
    }
  }

  const imageLinks = new Set()
  for (const m of html.matchAll(/<img\s[^>]*>/gi)) {
    const tag = m[0]
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i)
    const altMatch = tag.match(/\balt=["']([^"']*)["']/i)
    const context = `${srcMatch?.[1] || ''} ${altMatch?.[1] || ''}`
    if (srcMatch && IMAGE_CUE_RE.test(context)) {
      const resolved = resolve(srcMatch[1])
      if (resolved && !/\.(svg)(\?|$)/i.test(resolved)) imageLinks.add(resolved)
    }
  }

  return {
    pdfs: [...pdfLinks].slice(0, 2),
    images: [...imageLinks].slice(0, 3),
  }
}

/**
 * Runs OCR across a bounded set of candidate PDFs/images found on the page and returns their
 * text joined into one block, labeled by source, ready to append to the page's own extracted
 * text before identity/spec extraction. Returns '' (not null) when Mistral isn't configured or
 * nothing worth OCR-ing was found, so callers can always safely concatenate the result.
 */
export async function extractOcrEnrichedText(html, pageUrl) {
  if (!isMistralConfigured()) return ''
  const { pdfs, images } = findOcrCandidates(html, pageUrl)
  if (pdfs.length === 0 && images.length === 0) return ''

  const results = await Promise.all([
    ...pdfs.map(async (url) => {
      const text = await ocrDocument(url)
      return text ? `[From linked datasheet ${url}]\n${text}` : ''
    }),
    ...images.map(async (url) => {
      const text = await ocrImage(url)
      return text ? `[From diagram/spec image ${url}]\n${text}` : ''
    }),
  ])

  return results.filter(Boolean).join('\n\n')
}
