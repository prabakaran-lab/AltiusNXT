import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scrolls to the top on every route change. When the URL carries a #hash, scrolls to that
 * element instead — waiting a frame so the destination page has rendered it, and offsetting
 * for the sticky header.
 *
 * A link that points at the page the visitor is already on (the same path and #hash) changes
 * neither, so it is noticed through the navigation `key` and scrolls to its target again. A change
 * to the query string alone (for example the Resources tabs) still leaves the scroll position alone.
 */
export default function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation()
  const last = useRef(null)

  useEffect(() => {
    const prev = last.current
    last.current = { pathname, search, hash }
    if (prev && prev.pathname === pathname && prev.hash === hash && prev.search !== search) return

    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = decodeURIComponent(hash.slice(1))
    let attempts = 0
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) {
        const header = document.querySelector('.site-header')
        const offset = header ? header.getBoundingClientRect().height + 12 : 0
        const top = el.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top, behavior: 'smooth' })
      } else if (attempts++ < 10) {
        requestAnimationFrame(tryScroll)
      }
    }
    requestAnimationFrame(tryScroll)
  }, [pathname, search, hash, key])

  return null
}
