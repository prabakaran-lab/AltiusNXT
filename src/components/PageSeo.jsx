import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { setHead, addStructuredData } from '../ssrHead.js'

const SITE_URL = 'https://www.altiusnxt.com'
// A static file in public/ (served as-is, same URL in dev and prod — no bundler/SSR asset-import
// complexity). Placeholder only: replace with a real 1200x630 branded image when one is designed.
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`

function setMeta(name, value, attr = 'name') {
  let tag = document.querySelector(`meta[${attr}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  const previous = tag.content
  tag.content = value
  return () => { tag.content = previous }
}

export function breadcrumb(path, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
    ],
  }
}

// Pages that are served at more than one address point to the main one.
const CANONICAL_PATH = { '/how-it-works': '/' }

// One <link rel="canonical"> for the page: no query string, no hash, no trailing slash.
function setCanonical(href) {
  let link = document.querySelector('link[rel="canonical"]')
  const created = !link
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  const previous = link.href
  link.href = href
  return () => { if (created) link.remove(); else link.href = previous }
}

export default function PageSeo({ title, description, keywords, structuredData = [], image = DEFAULT_OG_IMAGE }) {
  const { pathname } = useLocation()
  const clean = pathname.replace(/\/+$/, '') || '/'
  const canonical = SITE_URL + (CANONICAL_PATH[clean] ?? clean)

  // Render-time (not effect-time): the one thing a build-time prerender can read, since useEffect
  // below never runs during server rendering. No-op in the browser (see ssrHead.js).
  setHead({ title, description, keywords: keywords.join(', '), canonical, ogType: 'website', ogImage: image })
  structuredData.forEach(addStructuredData)

  useEffect(() => {
    const restoreCanonical = setCanonical(canonical)
    const restoreOgUrl = setMeta('og:url', canonical, 'property')
    const previousTitle = document.title
    document.title = title
    const restoreDescription = setMeta('description', description)
    const restoreKeywords = setMeta('keywords', keywords.join(', '))
    const restoreOgTitle = setMeta('og:title', title, 'property')
    const restoreOgDescription = setMeta('og:description', description, 'property')
    const restoreOgImage = setMeta('og:image', image, 'property')
    const restoreOgType = setMeta('og:type', 'website', 'property')
    const restoreTwitterCard = setMeta('twitter:card', 'summary_large_image')
    const scripts = structuredData.map((data, index) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.pageSeo = String(index)
      script.text = JSON.stringify(data)
      document.head.appendChild(script)
      return script
    })
    return () => {
      document.title = previousTitle
      restoreDescription()
      restoreKeywords()
      restoreOgTitle()
      restoreOgDescription()
      restoreOgImage()
      restoreOgType()
      restoreTwitterCard()
      restoreCanonical()
      restoreOgUrl()
      scripts.forEach((script) => script.remove())
    }
  }, [title, description, keywords, structuredData, pathname, canonical, image])

  return null
}
