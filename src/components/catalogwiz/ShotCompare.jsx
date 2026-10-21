import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ArrowDown } from 'lucide-react'

/* The visitor's real page, before and after, as two pictures taken by the server from the live URL:
   before is the page exactly as it is; after is the same page with the enrichment placed into it.
   Both pictures sit on top of each other in ONE scrolling window, so Before and After always show the same part of the page.
   Switching to After plays the enrichment sweep: a glowing scan line crosses the page and the enriched page is revealed
   behind it. GSAP only clips and fades the after picture (never scales it), so the page is never distorted or blurred. */

const calm = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* For the catalog samples there is no real page to photograph, so the two pages come in as rendered elements instead
   (beforeNode / afterNode, see SampleStore.jsx); everything else, the sweep and the glide to the changes, is the same. */
export default function ShotCompare({ shots = {}, mode, host, beforeNode, afterNode }) {
  const scrollRef = useRef(null)
  const stackRef = useRef(null)
  const afterRef = useRef(null)
  const beamRef = useRef(null)
  const first = useRef(true)

  // scrolls the window to where the enrichment was placed in the after picture
  const toChanges = (smooth = true) => {
    const box = scrollRef.current
    if (!box) return
    const img = afterRef.current
    // a rendered page marks where its enrichment starts; a picture says so as a fraction of its height
    const mark = img?.querySelector?.('[data-cw-focus]')
    const y = mark
      ? Math.max(0, mark.getBoundingClientRect().top - img.getBoundingClientRect().top - 24)
      : Math.max(0, (shots.afterFocus || 0) * (img?.offsetHeight || box.scrollHeight) - 24)
    if (!smooth || calm()) { box.scrollTop = y; return }
    gsap.to(box, { scrollTop: y, duration: 1.6, ease: 'power2.inOut' })
  }

  useEffect(() => {
    const el = afterRef.current
    const beam = beamRef.current
    const box = scrollRef.current
    if (!el || !beam || !box) return undefined
    const quick = calm()
    const initial = first.current
    first.current = false
    gsap.killTweensOf([el, beam, box])

    if (mode === 'before') {
      el.style.clipPath = 'inset(0 0 0 0)'
      gsap.set(beam, { opacity: 0 })
      // the original page is shorter than the enriched one: Before never stays scrolled past its end
      const beforeImg = box.querySelector('.shc-before')
      const max = Math.max(0, (beforeImg?.offsetHeight || 0) - box.clientHeight)
      if (box.scrollTop > max) gsap.to(box, { scrollTop: max, duration: quick ? 0 : 0.6, ease: 'power2.out' })
      const tw = gsap.to(el, { opacity: 0, duration: initial || quick ? 0 : 0.5, ease: 'power2.out' })
      return () => tw.kill()
    }

    // AFTER: the enrichment sweep, left to right across the visible window
    if (quick) { gsap.set(el, { opacity: 1, clipPath: 'inset(0 0 0 0)' }); return undefined }
    const p = { v: 0 }
    const paint = () => {
      const w = stackRef.current?.offsetWidth || box.clientWidth
      el.style.clipPath = `inset(0 ${100 - p.v}% 0 0)`
      gsap.set(beam, { x: (w * p.v) / 100 - box.scrollLeft })
    }
    gsap.set(el, { opacity: 1 })
    paint()
    // every switch to After: the page is first shown from the top, the sweep reveals the enriched page,
    // then the window glides down to the enriched section (description and specification table)
    const tl = gsap.timeline({ onComplete: () => { el.style.clipPath = 'inset(0 0 0 0)' } })
    if (box.scrollTop > 0) tl.to(box, { scrollTop: 0, duration: 0.5, ease: 'power2.out' })
    tl.to(beam, { opacity: 1, duration: 0.2 })
      .to(p, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: paint }, '<')
      .to(beam, { opacity: 0, duration: 0.35 }, '-=0.2')
      .add(() => toChanges(true), '+=0.35')
    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  return (
    <div className="shc">
      <div className="shc-view">
        <div className="shc-scroll" ref={scrollRef}>
          <div className="shc-stack" ref={stackRef}>
            {beforeNode ? <div className="shc-before shc-page" aria-label="The original supplier listing">{beforeNode}</div> : (
              <img
                className="shc-before"
                src={shots.before}
                alt={`Your product page on ${host}, exactly as it is today`}
                width={shots.width}
                height={shots.beforeHeight}
                draggable={false}
              />
            )}
            {afterNode ? (
              <div ref={afterRef} className="shc-after shc-page" aria-label="The same listing after CatalogWiz enrichment" style={{ opacity: mode === 'before' ? 0 : 1 }}>{afterNode}</div>
            ) : (
              <img
                ref={afterRef}
                className="shc-after"
                src={shots.after}
                alt={`The same page on ${host} with the CatalogWiz enrichment placed into it`}
                width={shots.width}
                height={shots.afterHeight}
                style={{ opacity: mode === 'before' ? 0 : 1 }}
                draggable={false}
              />
            )}
          </div>
        </div>
        {/* the scan line of the enrichment sweep: shown only while it plays */}
        <span className="shc-beam" ref={beamRef} aria-hidden="true" />
      </div>

      <div className="shc-tools">
        {mode === 'after' && <button type="button" className="shc-jump" onClick={() => toChanges(true)}><ArrowDown size={14} strokeWidth={2.4} />Jump to the enriched section</button>}
      </div>
    </div>
  )
}
