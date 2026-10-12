import { useEffect, useRef, useState } from 'react'
import { BarChart3, FileCheck2, FileText, Fingerprint, Link2, ListTree, ShieldCheck } from 'lucide-react'
import './AiLayers.css'

/* The seven layers of AI-ready product data, built from the bottom up. Example values are the TeSys Deca breaker used across the site. */
const LAYERS = [
  { n: 1, icon: Fingerprint, short: 'Identity', t: 'Identity and taxonomy', d: 'Manufacturer, MPN, GTIN, classification, UNSPSC / eClass / ETIM.', q: 'Can AI resolve the product?', ex: ['Schneider Electric', 'MPN TELGV3P73', 'Motor Protection Circuit Breakers'] },
  { n: 2, icon: ListTree, short: 'Attributes', t: 'Attribute normalization', d: 'Schema per category, units, thread pitches, validated against benchmark distributor sites.', q: 'Can AI read the specs?', ex: ['Current rating: 73 A', 'AC voltage: 690 V', 'Mounting: DIN Rail'] },
  { n: 3, icon: ShieldCheck, short: 'Verification', t: 'Expert verification', d: 'Domain-expert sign-off on every spec; no guessed values.', q: 'Are the specs right?', ex: ['Checked against the datasheet', 'Signed off by a data specialist'] },
  { n: 4, icon: FileCheck2, short: 'Compliance', t: 'Technical and compliance data', d: 'Datasheets, certifications, ratings as data; images and documents linked.', q: 'Can AI trust the product?', ex: ['Datasheet PDF', 'UL 60947-4-1', 'IEC/EN 60947-2'] },
  { n: 5, icon: Link2, short: 'Relationships', t: 'Relationships', d: 'Cross-references, mating parts, substitutes, variants.', q: 'Can AI answer “what fits, what’s equivalent”?', ex: ['Cross-reference', 'Mating part', 'Substitute', 'Variant'] },
  { n: 6, icon: FileText, short: 'Authority', t: 'Authority content', d: 'Application prose, buying guides, buyer-question coverage, ungated commercial signals.', q: 'Would AI choose it?', ex: ['Application: motor protection', 'Buying guide', 'Buyer Q&A'] },
  { n: 7, icon: BarChart3, short: 'Signals', t: 'Discoverability signals and monitoring', d: 'JSON-LD graph, answer-ready pages, continuous re-scoring across AI engines.', q: 'Does AI actually cite it?', ex: ['JSON-LD graph', 'Answer-ready page', 'Re-scored across AI engines'] },
]
const ENGINES = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity']
const STEP = 4.5
const HOLD = 3.4
const LOOP = LAYERS.length * STEP + HOLD
const ld = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'The 7 layers of AI-ready product data',
  itemListElement: LAYERS.map((l) => ({ '@type': 'ListItem', position: l.n, name: l.t, description: `${l.d} ${l.q}` })),
}

export default function AiLayers() {
  const ref = useRef(null)
  const st = useRef({ t: 0, visible: false, pickUntil: 0 })
  const [t, setT] = useState(0)
  const planes = useRef([])
  const [pick, setPick] = useState(null)
  const [calm] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (calm) return undefined
    const s = st.current
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting }, { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(ref.current)
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (s.visible && !document.hidden) {
        if (s.pickUntil && now > s.pickUntil) { s.pickUntil = 0; setPick(null) }
        if (!s.pickUntil) { s.t = (s.t + dt) % LOOP; acc += dt; if (acc > 0.04) { acc = 0; setT(s.t) } }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [calm])

  const built = calm ? 7 : Math.min(7, Math.floor(t / STEP) + 1)
  const shown = pick ? 7 : built
  const cur = pick ?? built
  const within = calm || pick ? 1 : Math.min(1, (t - (built - 1) * STEP) / STEP)
  const choose = (n, e) => { st.current.pickUntil = e.timeStamp + 12000; setPick(n) }

  return (
    <section className="sl" ref={ref} id="ai-ready-layers" aria-labelledby="sl-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="sl-wrap">
        <header className="sl-head">
          <p className="sl-eyebrow">AI-ready product data</p>
          <h2 id="sl-title">The 7 layers that make a product page <em>AI-ready.</em></h2>
          <p className="sl-sub">AI search engines and shopping assistants only recommend products they can identify, read, trust and compare. CatalogWiz builds that foundation from the bottom up.</p>
        </header>

        <div className="sl-grid">
          {/* ---------- exploded 3D stack: ghost outlines are always visible, layers drop onto them ---------- */}
          <div className="sl-iso" aria-hidden="true">
            <div className="sl-scene">
              {LAYERS.map((l) => <div key={`g${l.n}`} className={`sl-ghost g${l.n}${shown >= l.n ? ' filled' : ''}`} style={{ '--i': l.n - 1 }}><span><em>{l.n}</em>{l.short}</span></div>)}
              {LAYERS.map((l) => {
                const Ico = l.icon
                return (
                  <div key={l.n} ref={(el) => { planes.current[l.n] = el }} className={`sl-plane p${l.n}${shown >= l.n ? ' on' : ''}${cur === l.n ? ' cur' : ''}`} style={{ '--i': l.n - 1 }}>
                    <span className="lab"><em>{l.n}</em><Ico size={15} />{l.short}</span>
                    <span className="edge" />
                  </div>
                )
              })}
            </div>
            <div className={`sl-top${shown === 7 ? ' on' : ''}`}>
              <small>Answer-ready for</small>
              <span>{ENGINES.map((e, i) => <b key={e} style={{ '--i': i }}>{e}</b>)}</span>
            </div>
          </div>

          {/* ---------- spotlight: one detail card follows the layer being built, a stepper tracks progress ---------- */}
          <div className="sl-right">
            <ol className="sl-tabs" aria-label="Seven layers, built from the bottom up">
              {LAYERS.map((l) => {
                const done = shown > l.n || (shown === l.n && within > 0.85 && !pick)
                const Ico = l.icon
                return (
                  <li key={l.n} className={`${cur === l.n ? 'open' : ''}${shown >= l.n ? ' on' : ''}${done ? ' done' : ''}`}>
                    <button type="button" onClick={(e) => choose(l.n, e)} aria-label={`${l.n}. ${l.t}`} aria-current={cur === l.n ? 'step' : undefined}>
                      <Ico size={18} /><b>{l.n}</b>
                    </button>
                  </li>
                )
              })}
            </ol>
            {(() => {
              const l = LAYERS[cur - 1]
              const Ico = l.icon
              return (
                <article className="sl-spot" key={l.n} aria-live="polite">
                  <div className="sl-hd">
                    <span className="sl-badge"><Ico size={24} /></span>
                    <div><small>Layer {l.n} of {LAYERS.length}</small><h3>{l.t}</h3></div>
                  </div>
                  <p className="sl-d">{l.d}</p>
                  <blockquote className="sl-q">“{l.q}”</blockquote>
                  <ul>{l.ex.map((x, i) => <li key={x} style={{ '--i': i }}>{x}</li>)}</ul>
                  {!pick && <u style={{ transform: `scaleX(${within})` }} />}
                </article>
              )
            })()}
          </div>
        </div>
      </div>
    </section>
  )
}
