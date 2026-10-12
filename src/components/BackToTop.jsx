import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import './BackToTop.css'

const R = 21
const C = 2 * Math.PI * R

/* Floating back-to-top: appears after scrolling, ring shows page progress, rises to the top smoothly. */
export default function BackToTop() {
  const ring = useRef(null)
  const [show, setShow] = useState(false)
  const [rising, setRising] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const y = window.scrollY
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0
      if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - p))
      setShow(y > 600)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const go = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
    if (!calm) { setRising(true); window.setTimeout(() => setRising(false), 900) }
  }

  return (
    <button type="button" className={`btt${show ? ' show' : ''}${rising ? ' rising' : ''}`} onClick={go} aria-label="Back to top" tabIndex={show ? 0 : -1}>
      <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r={R} className="t" /><circle ref={ring} cx="24" cy="24" r={R} className="v" strokeDasharray={C} strokeDashoffset={C} /></svg>
      <ArrowUp size={18} strokeWidth={2.6} />
      <span className="lbl">Top</span>
    </button>
  )
}
