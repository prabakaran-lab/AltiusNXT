import { useEffect } from 'react'
import { addStructuredData } from '../../ssrHead.js'

const SITE_URL = 'https://www.altiusnxt.com'

/** items: [[name, path], ...] from Home down to the current page (path omitted/falsy on the last, current one). */
export default function useBreadcrumbSeo(items) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      ...items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 2, name, ...(path ? { item: `${SITE_URL}${path}` } : {}) })),
    ],
  }

  // Render-time, for the build-time prerender (see ssrHead.js) — the effect below never runs server-side.
  addStructuredData(data)

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.breadcrumbSeo = 'true'
    script.text = JSON.stringify(data)
    document.head.appendChild(script)
    return () => script.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)])
}
