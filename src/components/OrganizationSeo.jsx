import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { addStructuredData } from '../ssrHead.js'

const SITE_URL = 'https://www.altiusnxt.com'

// Worldwide service areas (specified explicitly, country by country).
const AREA_SERVED = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'New Zealand', 'Ireland', 'South Africa',
  'Netherlands', 'Lithuania', 'Germany', 'United Arab Emirates', 'Singapore', 'Kenya', 'France', 'Belgium', 'Malta',
]

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AltiusNxt Technologies',
  url: SITE_URL,
  logo: `${SITE_URL}/og-default.png`,
  sameAs: ['https://www.linkedin.com/company/altiusnxt-tech'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    email: 'sales@altiusnxt.com',
    telephone: '+1-313-486-9697',
    areaServed: AREA_SERVED,
  },
}

const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AltiusNxt',
  url: SITE_URL,
}

/**
 * Organization JSON-LD on every page; WebSite JSON-LD on the homepage only. Rendered once, outside
 * the router's <Routes>, next to Header/Footer in App.jsx — present for every route without touching
 * any individual page file. Render-time only (see ssrHead.js); nothing else to add client-side, since
 * this data never changes per visit and doesn't need the restore-on-unmount handling PageSeo needs.
 */
function injectJsonLd(key, data) {
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.dataset.orgSeo = key
  script.text = JSON.stringify(data)
  document.head.appendChild(script)
  return script
}

export default function OrganizationSeo() {
  const { pathname } = useLocation()
  const isHome = (pathname.replace(/\/+$/, '') || '/') === '/'

  // Render-time, for the build-time prerender (see ssrHead.js) — the effects below never run server-side.
  addStructuredData(ORGANIZATION)
  if (isHome) addStructuredData(WEBSITE)

  // Organization: present once, for the lifetime of the page (it never changes between routes).
  useEffect(() => {
    const script = injectJsonLd('organization', ORGANIZATION)
    return () => script.remove()
  }, [])

  // WebSite: only on the homepage, added/removed as the visitor navigates there and away client-side.
  useEffect(() => {
    if (!isHome) return undefined
    const script = injectJsonLd('website', WEBSITE)
    return () => script.remove()
  }, [isHome])

  return null
}
