import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import '../motion.css'

/* Site-wide entrance motion: headings, eyebrows, intro copy and cards rise in out of a soft blur as they
   enter the screen (a "resolving" look, like an AI answer coming into focus). Elements that already run
   their own reveal are left alone; the attribute is removed after the entrance so hover styles stay intact. */
const PICK = [
  'main h1', 'main h2',
  'main [class*="eyebrow"]', 'main .kicker',
  'main [class*="-sub"]', 'main [class*="-lede"]', 'main [class*="-lead"]',
  'main [class*="card"]:not([class*="cards"]):not([class*="card-"])', 'main .rl-card', 'main .rs-card',
  'main form', 'main [class*="-form"]', 'main [class*="-panel"]:not([role])', 'main [class*="-band"]', 'main details',
].join(',')
/* regions with their own choreography, plus anything that scrolls sideways */
const SKIP = '.at,.wt,.ar,.dcx,.ba-stage,.ind-panel,.hh,.ah,.atm-stage,.ss-stage,.al-stage,[role="tabpanel"],[aria-live],.visually-hidden,.rl-grid,.ch-grid,.atm-rail'

function ready(el) {
  if (el.closest(SKIP) || el.hasAttribute('data-mx')) return false
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden') return false
  const r = el.getBoundingClientRect()
  if (r.width < 4 || r.height < 4) return false
  if (parseFloat(cs.opacity) < 1 || cs.animationName !== 'none') return false
  if (parseFloat(cs.transitionDuration) > 0 && /opacity/.test(cs.transitionProperty)) return false
  for (let a = el.parentElement; a && a.id !== 'main'; a = a.parentElement) {
    if (parseFloat(getComputedStyle(a).opacity) < 1) return false
  }
  return true
}

export default function Motion() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return undefined
    const main = document.getElementById('main')
    if (!main) return undefined

    main.classList.remove('mx-route'); void main.offsetWidth; main.classList.add('mx-route')

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        const el = e.target
        io.unobserve(el)
        el.classList.add('mx-in')
        const done = () => { el.removeAttribute('data-mx'); el.classList.remove('mx-in'); el.style.removeProperty('--mx-d') }
        el.addEventListener('transitionend', (t) => { if (t.propertyName === 'opacity') done() }, { once: false })
        window.setTimeout(done, 1800)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })

    const scan = () => {
      const groups = new Map()
      main.querySelectorAll(PICK).forEach((el) => {
        if (!ready(el)) return
        const kind = /eyebrow|kicker/.test(el.className) ? 'eyebrow' : /^H[12]$/.test(el.tagName) ? 'head' : 'item'
        const g = groups.get(el.parentElement) || 0
        groups.set(el.parentElement, g + 1)
        el.style.setProperty('--mx-d', `${Math.min(g, 5) * 70}ms`)
        el.setAttribute('data-mx', kind)
        io.observe(el)
      })
    }

    /* failsafe: anything tagged that is on screen but was never reported by the observer is revealed */
    const guard = window.setInterval(() => {
      main.querySelectorAll('[data-mx]:not(.mx-in)').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.bottom > 0 && r.top < window.innerHeight) { io.unobserve(el); el.classList.add('mx-in'); window.setTimeout(() => { el.removeAttribute('data-mx'); el.classList.remove('mx-in') }, 1800) }
      })
    }, 1500)

    let raf = 0
    const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; scan() }) }
    const mo = new MutationObserver(queue)
    mo.observe(main, { childList: true, subtree: true })
    queue()
    return () => { cancelAnimationFrame(raf); window.clearInterval(guard); mo.disconnect(); io.disconnect() }
  }, [pathname])

  return null
}
