import { useEffect } from 'react'

/* Sets document.title and the meta description for the current page, restoring the previous values on unmount. */
export default function useDocumentMeta(title, description) {
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
    return () => {
      document.title = previousTitle
      if (created) tag.remove()
      else if (previousDescription !== null) tag.setAttribute('content', previousDescription)
    }
  }, [title, description])
}
