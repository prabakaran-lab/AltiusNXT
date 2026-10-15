/* Builds public/sitemap.xml and public/llms.txt from the site's real routes and the Resources data, so new articles,
   case studies and events appear in both files automatically on every build.
   Run by `npm run build` (and `npm run sitemap`). */
import { createServer } from 'vite'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE_URL = 'https://www.altiusnxt.com'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Pages that exist as real, indexable routes (redirects such as /how-it-works and /ai-page-check are left out on purpose).
const CORE = [
  '/',
  '/catalogwiz',
  '/ai-readiness-report',
  '/about-us',
  '/resources',
  '/resources/events',
  '/resources/case-studies',
  '/resources/blog',
  '/product-schema-markup',
  '/category-attributes',
  '/contact',
  '/sitemap',
  '/privacy-policy',
  '/terms',
]

// llms.txt: a short, plain-text map of the key pages with one-line descriptions, for AI assistants.
const KEY = [
  ['CatalogWiz', '/catalogwiz', 'AI product data enrichment: supplier files in, verified product data out. Every value is checked by an AltiusNxt product data engineer against the manufacturer source.'],
  ['Free AI Readiness Report', '/ai-readiness-report', 'Paste one product page. We ask ChatGPT, Claude, Gemini and Perplexity the questions buyers ask, show who they recommend, and an engineer approves the six-page report.'],
  ['About AltiusNxt', '/about-us', 'Company story since 2007, product categories covered, certifications (ISO 9001, ISO 27001) and clients.'],
  ['Resources', '/resources', 'Guides, case studies and events on product data and AI search for distributors.'],
  ['Product Schema Studio', '/product-schema-markup', 'Product schema markup (JSON-LD) examples for B2B product categories.'],
  ['Category Attribute Library', '/category-attributes', 'The attributes every industrial product record needs, per category.'],
  ['Contact', '/contact', 'Talk to a product data engineer.'],
]

const vite = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' })
try {
  const { sections, itemPath } = await vite.ssrLoadModule('/src/data/resources.js')
  const items = Object.values(sections).flatMap((s) => s.items.map((i) => itemPath(i)))
  const urls = [...new Set([...CORE, ...items])]
  const esc = (u) => u.replace(/&/g, '&amp;')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(SITE_URL + (u === '/' ? '/' : u))}</loc></url>`).join('\n')}\n</urlset>\n`
  mkdirSync(resolve(root, 'public'), { recursive: true })
  writeFileSync(resolve(root, 'public/sitemap.xml'), xml)

  const line = (title, path, note) => `- [${title}](${SITE_URL}${path})${note ? `: ${note}` : ''}`
  const group = (key) => sections[key].items.map((i) => line(String(i.title).replace(/\s+/g, ' ').trim(), itemPath(i)))
  const txt = [
    '# AltiusNxt',
    '',
    '> AltiusNxt is a product data engineering partner for industrial distributors, suppliers and manufacturers. Since 2007, its product data engineers have enriched 15M+ products for 500+ distributors in 15+ countries. They build, enrich and verify catalogs value by value, then test them on ChatGPT, Claude, Gemini, Perplexity and Google so buyers and AI can find them. CatalogWiz is AltiusNxt\'s AI enrichment platform. Offices: Farmington Hills, MI (USA) and Coimbatore (India). Certified to ISO 9001 and ISO 27001 by TÜV Austria.',
    '',
    '## Key pages',
    '',
    ...KEY.map(([t, p, n]) => line(t, p, n)),
    '',
    '## Case studies',
    '',
    ...group('case-studies'),
    '',
    '## Blog',
    '',
    ...group('blog'),
    '',
    '## Events',
    '',
    ...group('events'),
    '',
    '## Optional',
    '',
    line('Sitemap (HTML)', '/sitemap'),
    line('Sitemap (XML)', '/sitemap.xml'),
    line('Privacy Policy', '/privacy-policy'),
    line('Terms of Use', '/terms'),
    '',
  ].join('\n')
  writeFileSync(resolve(root, 'public/llms.txt'), txt)

  console.log(`sitemap.xml written: ${urls.length} URLs; llms.txt written`)
} finally {
  await vite.close()
}
