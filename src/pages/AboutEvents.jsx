import { useEffect, useRef, useState } from 'react'
import booth from '../assets/events/booth.webp'
import ceo from '../assets/events/ceo-booth.webp'
import visitors from '../assets/events/visitors.webp'
import demo from '../assets/events/demo.webp'
import screen from '../assets/events/screen.webp'
import './AboutEvents.css'

/* Trade-show photos from IRX. Captions are descriptive only. */
const SHOTS = [
  { src: booth, alt: 'The AltiusNxt Technologies booth A62 at IRX, with two team members in front of the display panels', cap: 'Booth A62 at IRX', cls: 'a' },
  { src: ceo, alt: 'An AltiusNxt team member talking with a visitor at the booth', cap: 'Talking product data with visitors', cls: 'b' },
  { src: demo, alt: 'A visitor and an AltiusNxt team member looking at an ecommerce product page on a monitor', cap: 'Live product page walkthrough', cls: 'c' },
  { src: visitors, alt: 'Two visitors in conversation with an AltiusNxt team member inside the booth', cap: 'Before and after, on the booth wall', cls: 'd' },
  { src: screen, alt: 'A team member showing an industrial supply product page on screen next to a customer logo wall', cap: 'Customer logo wall', cls: 'e' },
]

export default function AboutEvents() {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: window.innerWidth < 768 ? 0.04 : 0.15 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return (
    <section className={`aev${on ? ' on' : ''}`} ref={ref} aria-labelledby="aev-title">
      <div className="aev-wrap">
        <header className="aev-head">
          <p className="aev-eyebrow">On the road</p>
          <h2 id="aev-title">Meet the team at <span>industry events.</span></h2>
          <p className="aev-lede">We attend trade shows such as IRX to talk to distributors and manufacturers about product data, face to face.</p>
          <p className="aev-next">
            <b>Next:</b> B2B eCommerce World Americas · Nov 2–3, 2026 · JW Marriott Indianapolis. Bring one product page and we'll check it live.
          </p>
          <a className="aev-btn" href="mailto:sales@altiusnxt.com?subject=Book%20a%20meeting%20at%20B2B%20eCommerce%20World%20Americas">Book a meeting at the show</a>
        </header>
        <div className="aev-grid">
          {SHOTS.map((x, i) => (
            <figure key={x.cls} className={`aev-${x.cls}`} style={{ '--i': i }}>
              <img src={x.src} alt={x.alt} loading="lazy" />
              <figcaption>{x.cap}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
