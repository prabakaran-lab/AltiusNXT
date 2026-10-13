import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Publishes the site's articles, events and case studies as a machine-readable list: /resources-feed.json.
 *
 * It is generated at every build from the same data file the Resources pages use (src/data/resources.js), so a new
 * article or event appears in the list the moment it is published; there is nothing separate to maintain. The server
 * reads this list on a schedule and emails subscribers about any item it has not announced yet (see
 * server/src/services/announcements.js). Each item keeps its permanent `id`, which is how "new" is detected.
 *
 * resources.js imports its images as bundled assets, which plain Node cannot load, so the file is read as text with
 * those imports turned into plain path strings. The images are copied next to the feed (/feed-images/...) so each
 * item has an image address that emails can use.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const dataFile = path.resolve(here, '../data/resources.js')
const IMAGE_IMPORT = /^import\s+(\w+)\s+from\s+'([^']+\.(?:jpe?g|png|webp|gif|avif|svg))'\s*$/gm
const EMAIL_IMAGE_TYPES = /\.(jpe?g|png|webp|gif|avif)$/i

async function loadResources() {
  const source = fs.readFileSync(dataFile, 'utf8')
  const rewritten = source
    .replace(IMAGE_IMPORT, (_, name, file) => `const ${name} = ${JSON.stringify(file)}`)
    .replace(/^import\s+wpBlogs\s+from\s+'\.\/wpBlogs\.json'\s*$/m, `import wpBlogs from ${JSON.stringify(pathToFileURL(path.resolve(here, '../data/wpBlogs.json')).href)} with { type: 'json' }`)
  const tmp = path.join(os.tmpdir(), `resources-feed-${process.pid}-${Date.now()}.mjs`)
  fs.writeFileSync(tmp, rewritten)
  try {
    return await import(pathToFileURL(tmp).href)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

const clean = (s, max) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/** Builds the feed and the list of image files to publish beside it. */
export async function buildFeed() {
  const { events, caseStudies, blogs, itemPath } = await loadResources()
  const images = new Map() // public path -> source file
  const imageFor = (img) => {
    if (!img || typeof img !== 'string') return ''
    if (/^https?:\/\//i.test(img)) return EMAIL_IMAGE_TYPES.test(img.split('?')[0]) ? img : ''
    if (img.startsWith('/')) return EMAIL_IMAGE_TYPES.test(img) ? img : ''
    const file = path.resolve(path.dirname(dataFile), img) // an asset imported by resources.js
    if (!EMAIL_IMAGE_TYPES.test(file) || !fs.existsSync(file)) return '' // SVG and missing files are not used in emails
    const publicPath = `/feed-images/${path.basename(file)}`
    images.set(publicPath, file)
    return publicPath
  }
  const items = [...events, ...caseStudies, ...blogs].map((i) => ({
    id: i.id,
    type: i.type, // 'blog' | 'event' | 'case-study'
    title: clean(i.title, 200),
    summary: clean(i.summary || i.subtitle, 400),
    path: itemPath(i),
    image: imageFor(i.image),
    date: i.published || i.startDate || i.date || '',
    when: i.type === 'event' ? [i.date, i.venue].filter(Boolean).join(' · ') : '',
  }))
  return { feed: { generatedAt: new Date().toISOString(), count: items.length, items }, images }
}

export default function resourcesFeed() {
  return {
    name: 'resources-feed',
    // npm run dev: serve the feed on demand
    configureServer(server) {
      server.middlewares.use('/resources-feed.json', async (req, res) => {
        try {
          const { feed } = await buildFeed()
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(feed, null, 2))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
    // npm run build: write the feed and its images into the build output
    async generateBundle() {
      const { feed, images } = await buildFeed()
      this.emitFile({ type: 'asset', fileName: 'resources-feed.json', source: JSON.stringify(feed, null, 2) })
      for (const [publicPath, file] of images) this.emitFile({ type: 'asset', fileName: publicPath.slice(1), source: fs.readFileSync(file) })
    },
  }
}
