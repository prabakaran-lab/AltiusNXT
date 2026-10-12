/* Reads the WordPress export (altiusnxt-blog-posts-with-images.json) and writes src/data/wpBlogs.json
   (the blog posts not yet on the site), docs/content-audit.csv and docs/redirect-map.csv.
   Run: node scripts/extract-wp-blogs.mjs "<path to altiusnxt-blog-posts-with-images.json>" */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const src = process.argv[2]
if (!src) { console.error('Usage: node scripts/extract-wp-blogs.mjs <export.json>'); process.exit(1) }
const posts = JSON.parse(readFileSync(src, 'utf8'))

/* Posts already built by hand on the site (old WordPress slug -> existing new path). */
const EXISTING = {
  'data-enrichment-improves-kempston-controls-website-traffic': '/resources/case-studies/kempston-controls',
  'the-screwman-tightens-its-business-presence-with-a-new-e-store': '/resources/case-studies/the-screwman',
  'rose-scientific-canada-from-static-site-to-dynamic-ecommerce-powerhouse': '/resources/case-studies/rose-scientific-canada',
  'irx-2025': '/resources/events/irx-2025',
  'toolfair-harrogate-2025-15th-16th-may': '/resources/events/toolfair-harrogate-2025',
  'chemuk-2025': '/resources/events/chemuk-2025',
  'why-product-data-cleansing-is-a-game-changer-for-ecommerce-stores': '/resources/blog/product-data-cleansing-game-changer',
  'unlocking-ecommerce-success-how-to-implement-a-platform-that-converts': '/resources/blog/implement-ecommerce-platform-that-converts',
  'stay-ahead-in-2025-how-data-normalization-boosts-ecommerce-efficiency-for-industrial-distributors-and-retailers': '/resources/blog/data-normalization-2025',
  'elevating-your-e-commerce-strategy-with-product-attribute-development': '/resources/blog/product-attribute-development',
}
const TYPE = { Blogs: 'blog', 'Case Study': 'case-study', 'Upcoming Events': 'event' }

const ent = (s) => s.replace(/&amp;/g, '&').replace(/&#8217;/g, '’').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const text = (h) => ent(h.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pretty = (d) => { const [y, m, day] = d.slice(0, 10).split('-').map(Number); return `${MONTHS[m - 1]} ${day}, ${y}` }
function summary(h) {
  const t = text(h.split(/<h[1-6]/i)[0].length > 80 ? h.split(/<h[1-6]/i)[0] : h)
  const cut = t.replace(/^Introduction\s+/, '').slice(0, 230)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '))
  return stop > 90 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

/* Every image of an imported post is downloaded to public/resources/wp so the site never hot-links WordPress. */
mkdirSync('public/resources/wp', { recursive: true })
const local = async (url) => {
  const name = url.split('/').pop().split('?')[0]
  const file = `public/resources/wp/${name}`
  if (!existsSync(file)) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  return `/resources/wp/${name}`
}

const audit = [['Title', 'Original URL', 'Assigned type', 'Featured image', 'Inline images', 'Status on site', 'Note']]
const redirects = [['Old WordPress path', 'New path']]
const blogs = []
const map = new Map()
const wpAll = /https?:\/\/altiusnxt\.com\/wp-content\/uploads\/[^"'\s)]+\.(?:webp|png|jpe?g|gif|svg)/gi
for (const p of posts) {
  const wp = /https?:\/\/altiusnxt\.com\/wp-content\/uploads\/[^"'\s)]+\.(?:webp|png|jpe?g|gif|svg)/gi
  const type = TYPE[p.categories[0]] ?? 'unclassified'
  const oldPath = new URL(p.originalUrl).pathname
  const existing = EXISTING[p.slug]
  const newPath = existing ?? `/resources/blog/${p.slug}`
  redirects.push([oldPath, newPath])
  audit.push([ent(p.title), p.originalUrl, type, p.featuredImage ? 'yes (remote WP URL)' : 'MISSING', p.contentImages.length, existing ? `already built: ${existing}` : 'added from JSON', type === 'blog' ? '' : 'Source category kept; no News records exist in the export'])
  if (existing || type !== 'blog') continue
  const html = p.contentHtml.replace(/<!--[sS]*?-->/g, '')
  for (const u of new Set([...(html.match(wp) ?? []), p.featuredImage])) if (!existing && type === 'blog') map.set(u, await local(u))
  blogs.push({
    id: `blog-wp-${p.id}`, wpId: p.id, slug: p.slug, type: 'blog', category: p.categories[0],
    title: ent(p.title), summary: summary(p.contentHtml),
    image: p.featuredImage, published: p.date.slice(0, 10), publishedLabel: pretty(p.date), updated: p.modified.slice(0, 10),
    seoTitle: p.seoTitle && !/^[a-z0-9-]+$/.test(p.seoTitle) ? p.seoTitle : '', seoDescription: p.seoDescription,
    originalUrl: p.originalUrl, minutes: Math.max(1, Math.round(text(p.contentHtml).split(' ').length / 200)),
    html: p.contentHtml.replace(/<!--[\s\S]*?-->/g, ''),
  })
}
for (const b of blogs) {
  b.image = map.get(b.image)
  b.html = b.html.replace(wpAll, (u) => map.get(u) ?? u)
}
blogs.sort((a, b) => b.published.localeCompare(a.published))
writeFileSync('src/data/wpBlogs.json', JSON.stringify(blogs, null, 2))
const csv = (rows) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
writeFileSync('docs/content-audit.csv', csv(audit))
writeFileSync('docs/redirect-map.csv', csv(redirects))
console.log(`${posts.length} posts read, ${blogs.length} blogs written`)
