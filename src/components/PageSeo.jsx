import { useEffect } from 'react'

const SITE_URL = 'https://www.altiusnxt.com'

function setMeta(name, value) {
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = name
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

export default function PageSeo({ title, description, keywords, structuredData = [] }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    const restoreDescription = setMeta('description', description)
    const restoreKeywords = setMeta('keywords', keywords.join(', '))
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
      scripts.forEach((script) => script.remove())
    }
  }, [title, description, keywords, structuredData])

  return null
}
