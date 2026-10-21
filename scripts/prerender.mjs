/* Build-time prerender: renders every real route to its own static dist/<route>/index.html, with real
   page text and correct <head> tags baked in — what a crawler that doesn't run JavaScript sees.
   Run by `npm run build`, after `vite build` (the normal client build) has produced dist/.
     1. Builds a short-lived, Node-only SSR bundle of src/entry-server.jsx into dist-server/.
     2. Gets the full route list the same way generate-sitemap.mjs does (reads src/data/resources.js
        through Vite, so every case study / blog post / event is included automatically).
     3. Renders each route with that bundle's render(url), which also returns the <head> data each
        page's own <PageSeo>/useDocumentMeta/useBreadcrumbSeo/OrganizationSeo collected.
     4. Takes dist/index.html exactly as `vite build` wrote it (correct, already-hashed script/css
        tags) as the one template, injects that route's HTML into <div id="root"> and its <head> data,
        and writes the result to that route's own output file.
     5. Deletes dist-server/ — it's a build tool, not something to deploy. */
import { build, createServer } from 'vite'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(root, 'dist')
const SSR_OUT = resolve(root, 'dist-server')

// Redirect-only routes (<Navigate>, no real content of their own) are deliberately not prerendered —
// same routes generate-sitemap.mjs already leaves out of the public sitemap, for the same reason.
const CORE = [
  '/', '/catalogwiz', '/ai-readiness-report', '/about-us',
  '/resources', '/resources/browse', '/resources/events', '/resources/case-studies', '/resources/blog',
  '/product-schema-markup', '/category-attributes', '/contact', '/sitemap', '/privacy-policy', '/terms',
]

async function getRoutes() {
  const vite = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { sections, itemPath } = await vite.ssrLoadModule('/src/data/resources.js')
    const items = Object.values(sections).flatMap((s) => s.items.map((i) => itemPath(i)))
    return [...new Set([...CORE, ...items])]
  } finally {
    await vite.close()
  }
}

function outputPath(route) {
  if (route === '/') return resolve(DIST, 'index.html')
  return resolve(DIST, route.replace(/^\//, ''), 'index.html')
}

/** Strips the few attribute-bearing tags this route owns (title, meta description/keywords/og:*,
 *  twitter:card, canonical) from the template, then injects this route's own values for each. Any
 *  tag the template doesn't have (a page's canonical, twitter:card) is simply added. */
function injectHead(templateHtml, head) {
  let html = templateHtml
  const stripPatterns = [
    /<title>[\s\S]*?<\/title>\s*/,
    /<meta\s+name=["']description["'][^>]*>\s*/,
    /<meta\s+name=["']keywords["'][^>]*>\s*/,
    /<meta\s+property=["']og:[^"']+["'][^>]*>\s*/g,
    /<meta\s+name=["']twitter:card["'][^>]*>\s*/,
    /<link\s+rel=["']canonical["'][^>]*>\s*/,
  ]
  for (const re of stripPatterns) html = html.replace(re, '')

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const tags = [
    `<title>${esc(head.title)}</title>`,
    head.description && `<meta name="description" content="${esc(head.description)}" />`,
    head.keywords && `<meta name="keywords" content="${esc(head.keywords)}" />`,
    head.canonical && `<link rel="canonical" href="${esc(head.canonical)}" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    head.description && `<meta property="og:description" content="${esc(head.description)}" />`,
    head.canonical && `<meta property="og:url" content="${esc(head.canonical)}" />`,
    `<meta property="og:type" content="${esc(head.ogType || 'website')}" />`,
    head.ogImage && `<meta property="og:image" content="${esc(head.ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...head.structuredData.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`),
  ].filter(Boolean).join('\n    ')

  return html.replace('</head>', `    ${tags}\n  </head>`)
}

async function main() {
  if (!existsSync(resolve(DIST, 'index.html'))) {
    throw new Error('dist/index.html not found — run `vite build` before the prerender step.')
  }

  console.log('[prerender] building the SSR bundle...')
  await build({
    root,
    build: { ssr: 'src/entry-server.jsx', outDir: 'dist-server', emptyOutDir: true },
    logLevel: 'warn',
  })

  const { render } = await import(pathToFileURL(resolve(SSR_OUT, 'entry-server.js')).href)
  const template = readFileSync(resolve(DIST, 'index.html'), 'utf8')
  const routes = await getRoutes()

  let written = 0
  for (const route of routes) {
    const { html, head } = render(route)
    const page = injectHead(template, head).replace('<div id="root"></div>', `<div id="root">${html}</div>`)
    const outPath = outputPath(route)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, page)
    written += 1
  }
  console.log(`[prerender] wrote ${written} routes`)

  rmSync(SSR_OUT, { recursive: true, force: true })
}

await main()
