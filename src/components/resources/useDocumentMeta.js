import { useEffect } from 'react'
import { setHead } from '../../ssrHead.js'

/* Sets document.title and the meta description for the current page, restoring the previous values on unmount. */
export default function useDocumentMeta(title, description, keywords) {
  // Render-time, for the build-time prerender (see ssrHead.js) — useEffect below never runs server-side.
  setHead({ title: `${title} | AltiusNxt`, description: description || '', keywords: (keywords || []).join(', ') })

  useEffect(() => {
    const previousTitle = document.title
    let tag = document.querySelector('meta[name="description"]')
    const created = !tag
    if (created) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    const previousDescription = tag.getAttribute('content')
    document.title = `${title} | AltiusNxt`
    if (description) tag.setAttribute('content', description)
    let kw = document.querySelector('meta[name="keywords"]')
    const kwCreated = !kw
    if (kwCreated) {
      kw = document.createElement('meta')
      kw.setAttribute('name', 'keywords')
      document.head.appendChild(kw)
    }
    const previousKeywords = kw.getAttribute('content')
    if (keywords && keywords.length) kw.setAttribute('content', keywords.join(', '))
    return () => {
      document.title = previousTitle
      if (created) tag.remove()
      else if (previousDescription !== null) tag.setAttribute('content', previousDescription)
      if (kwCreated) kw.remove()
      else if (previousKeywords !== null) kw.setAttribute('content', previousKeywords)
    }
  }, [title, description, keywords])
}
