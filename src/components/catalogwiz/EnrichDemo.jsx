import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CircleAlert, ScanLine, Search, Sparkles } from 'lucide-react'
import { TESYS } from '../sampleProduct.js'
import { SAMPLES } from '../catalogSamples.js'
import { CATEGORIES } from '../../pages/attributeLibraryData.js'
import LiveDemoModal from './LiveDemoModal.jsx'
import LiveBeforeAfter from './LiveBeforeAfter.jsx'
import EnrichStory from './EnrichStory.jsx'
import './EnrichStory.css'
import { buildSampleResult } from './sampleResult.js'
import { runLiveEnrichment } from './liveEnrich.js'
import './EnrichDemo.css'

/* The nine real catalog products from the Category Attribute Guide. Raw rows are a deliberately messy supplier version
   (units glued on, "Y" for "Yes"); "norm" rows fix those, "fill" rows are attributes found in the spec sheet. */
const IMG = { electronic: TESYS.images.front, industrial: SAMPLES.bearings.img, tools: SAMPLES.tools.img, medical: SAMPLES.medical.img, janitorial: SAMPLES.janitorial.img, ppe: SAMPLES.gloves.img, office: SAMPLES.office.img, welding: SAMPLES.welding.img, fire: SAMPLES.fire.img }
const NAME = { electronic: 'Motor circuit breaker, 3 pole', industrial: 'Ball bearing, 0.625 in bore', tools: '18 V hammer drill driver', medical: 'IV giving set, non vented', janitorial: 'Hot water pressure washer', ppe: 'Cut-resistant work glove', office: '10-digit desk calculator', welding: 'Stick/TIG welder, 200 A', fire: 'Single-jacket fire hose' }
const PERSONAS = { electronic: ['Electrician', 'Facility manager'], industrial: ['Maintenance engineer', 'Buyer'], tools: ['Contractor', 'DIY buyer'], medical: ['Nurse', 'Procurement'], janitorial: ['Facility manager', 'Contractor'], ppe: ['Safety officer', 'Site manager'], office: ['Office manager', 'Student'], welding: ['Fabricator', 'Workshop owner'], fire: ['Fire officer', 'Safety manager'] }
const messy = (v) => v.replace(/(\d)\s+([A-Za-zµ°%Ω]+)/g, '$1$2').replace(/^Yes$/, 'Y').replace(/^No$/, 'N')
const simple = ([, v]) => v.length <= 22 && !v.includes(' · ')

const SUPPLIER_FIELDS = { electronic: 5, industrial: 3, tools: 4, medical: 3, janitorial: 4, ppe: 5, office: 3, welding: 4, fire: 5 }
const MAX_FILL = 24
const PRODUCTS = CATEGORIES.map((c) => {
  const sku = c.ref.split(' · ')[1].replace(/\s*\(.*\)/, '')
  const pool = c.attrs.filter(simple)
  /* each supplier sends a different, small set (3 to 5 fields, SKU included, up to 2 of them messy); CatalogWiz fills the rest of the category schema */
  const nSup = SUPPLIER_FIELDS[c.id] - 1
  const normSrc = pool.filter(([, v]) => messy(v) !== v).slice(0, 2)
  const plain = pool.filter((x) => !normSrc.includes(x)).slice(0, nSup - normSrc.length)
  const base = pool.filter((x) => normSrc.includes(x) || plain.includes(x))
  const rest = pool.filter((x) => !base.includes(x))
  const missSet = new Set(c.miss)
  const fillSrc = [...rest.filter(([l]) => missSet.has(l)), ...rest.filter(([l]) => !missSet.has(l))].slice(0, MAX_FILL)
  const people = PERSONAS[c.id]
  return {
    id: c.id, name: NAME[c.id], tag: c.name, img: IMG[c.id], personas: people, sku,
    raw: [['SKU', sku], ...base.map(([l, v]) => [l, normSrc.some(([x]) => x === l) ? messy(v) : v])],
    changes: [
      ...normSrc.map(([l, v], i) => ({ k: 'norm', l, from: messy(v), to: v, who: people[i % 2], why: 'Standard unit and spacing, so filters and comparison work.' })),
      ...fillSrc.map(([l, v], i) => ({ k: 'fill', l, to: v, who: people[(i + 1) % 2], why: `Answers a common buyer question about ${l.toLowerCase()}.` })),
    ],
  }
})
/* A visitor's own page: the server returns the verified result, shown in the same Before / After window as the samples. */
const liveToProduct = (r) => ({ id: `live-${Date.now()}`, live: true, r })
// the story a sample plays before its result: the same stages the server reports for a live page
const SAMPLE_STAGES = ['Reading your product page', 'Identifying the product', 'Checking the manufacturer’s published specifications', 'Writing the enriched title, description and attributes', 'Looking for more verified attributes', 'Placing the product in its taxonomy', 'Preparing the before and after view of your page']
const SAMPLE_STEP_MS = 1100

export default function EnrichDemo({ children }) {
  const demoRef = useRef(null)
  const inputRef = useRef(null)
  const [pid, setPid] = useState(null)
  const [url, setUrl] = useState('')
  const [seen, setSeen] = useState(false)
  const [calm] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [live, setLive] = useState(null)
  const [askUrl, setAskUrl] = useState('')
  const [phase, setPhase] = useState('idle')
  const [stage, setStage] = useState('')
  const [liveErr, setLiveErr] = useState('')
  const [waited, setWaited] = useState(0)
  const [sampleRun, setSampleRun] = useState(null) // { name } while a sample's story plays

  const p = useMemo(() => (live && pid === live.id ? live : PRODUCTS.find((x) => x.id === pid)) || null, [pid, live])
  // What the Before / After window shows: the live result, or the chosen sample in the same shape.
  const view = useMemo(() => (p ? (p.live ? p.r : buildSampleResult(p)) : null), [p])

  useEffect(() => {
    const f = requestAnimationFrame(() => setSeen(true))
    return () => cancelAnimationFrame(f)
  }, [])

  useEffect(() => {
    if (phase !== 'loading') return undefined
    const t0 = Date.now()
    setWaited(0)
    const id = setInterval(() => setWaited(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(id)
  }, [phase])

  const toDemo = () => requestAnimationFrame(() => demoRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }))
  // A sample is enriched the way a live page is shown: the 3D story plays through its stages (quickly, the data is
  // already verified), then the before / after opens. Reduced motion skips straight to the result.
  const sampleTimers = useRef([])
  const clearSample = () => { sampleTimers.current.forEach(clearTimeout); sampleTimers.current = [] }
  useEffect(() => clearSample, [])
  const run = (id) => {
    clearSample()
    setLive(null); setLiveErr('')
    if (calm) { setSampleRun(null); setPhase('idle'); setPid(id); toDemo(); return }
    const prod = PRODUCTS.find((x) => x.id === id)
    setPid(null); setSampleRun({ name: prod?.name || 'sample' }); setStage(SAMPLE_STAGES[0]); setPhase('loading')
    toDemo()
    SAMPLE_STAGES.forEach((s, i) => { if (i) sampleTimers.current.push(setTimeout(() => setStage(s), i * SAMPLE_STEP_MS)) })
    sampleTimers.current.push(setTimeout(() => { setSampleRun(null); setPhase('idle'); setPid(id); toDemo() }, SAMPLE_STAGES.length * SAMPLE_STEP_MS))
  }
  // "Check my page": ask who is requesting first, then run the live enrichment on their page.
  const submit = (e) => { e.preventDefault(); if (url.trim()) setAskUrl(url.trim()) }
  const startLive = async (lead) => {
    const target = askUrl
    setAskUrl('')
    clearSample(); setSampleRun(null); setPid(null); setLive(null); setLiveErr(''); setStage('Sending your request'); setPhase('loading')
    toDemo()
    try {
      const result = await runLiveEnrichment({ ...lead, url: target }, { onStage: (s) => s && setStage(s) })
      const product = liveToProduct(result)
      setLive(product); setPid(product.id); setPhase('idle')
      toDemo()
    } catch (err) {
      setLiveErr(err.message); setPhase('error')
    }
  }
  const retry = () => { setPhase('idle'); setLiveErr(''); inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' }) }

  return (
    <div className={`rd${seen ? ' seen' : ''}`} id="try">
      <section className="rd-hero">
        <div className="rd-wrap">
          <span className="rd-pill"><Sparkles size={13} />Your turn · Try it free</span>
          <h2>See your own product, <em>enriched.</em></h2>
          <p className="rd-lead">Paste a product page link, or pick a sample below to see the before and after in seconds.</p>
          <form className="rd-form" onSubmit={submit}>
            <label className="rd-input"><Search size={16} /><input ref={inputRef} type="url" inputMode="url" placeholder="Paste any product page URL" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Product page URL" /></label>
            <button type="submit" className="btn btn-primary" disabled={!url.trim() || phase === 'loading'}>Check my page <ArrowRight size={16} /></button>
          </form>
          <p className="rd-hint">CatalogWiz AI will enrich your own product page live, checked against your page and the manufacturer’s published data. It takes about a minute.</p>
          <p className="rd-or">Or pick a sample. They enrich in seconds.</p>
          <ul className="rd-grid">
            {PRODUCTS.map((x, i) => (
              <li key={x.id} style={{ '--i': i }}>
                <button type="button" className={`rd-card${pid === x.id ? ' on' : ''}`} onClick={() => run(x.id)} aria-pressed={pid === x.id}>
                  <span className={`img${x.dark ? ' dark' : ''}`}><img src={x.img} alt="" loading="lazy" /></span>
                  <small>{x.tag}</small>
                  <b>{x.name}</b>
                  <em>{pid === x.id ? 'Showing below' : 'Enrich this'}<ArrowRight size={13} /></em>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rd-demo" ref={demoRef} aria-live="polite">
        <div className="rd-wrap">
          {phase === 'loading' ? (
            <div className="rd-stage rd-load" role="status">
              <header className="rd-bar">
                <span className="dots" aria-hidden="true"><i /><i /><i /></span>
                <span className="url">app.catalogwiz.ai / enrich / <b>{sampleRun ? 'sample' : 'your page'}</b></span>
                <span className="ai"><b>CatalogWiz <em>AI</em></b></span>
                <em className="st">{waited}s</em>
                <i className="pg" style={{ transform: `scaleX(${sampleRun ? Math.min(1, (SAMPLE_STAGES.indexOf(stage) + 1) / SAMPLE_STAGES.length) : Math.min(0.94, waited / 130)})` }} />
              </header>
              <EnrichStory stage={stage} url={sampleRun ? '' : askUrl || url} label={sampleRun ? `the sample listing: ${sampleRun.name}` : undefined} waited={sampleRun ? 0 : waited} />
            </div>
          ) : phase === 'error' ? (
            <div className="rd-empty rd-err" role="alert"><CircleAlert size={22} /><b>We couldn’t enrich that page</b><span>{liveErr.replace(/^We couldn't enrich that page:\s*/i, '')}</span><button type="button" className="btn btn-outline" onClick={retry}>Try another page</button></div>
          ) : !p ? (
            <div className="rd-empty"><ScanLine size={22} /><b>Paste your page or choose a sample above</b><span>You will see the original listing first, then the enriched version.</span></div>
          ) : (
            <LiveBeforeAfter key={p.id} r={view} />
          )}
          <p className="rd-foot">
            {p?.live
              ? `Live result for ${p.r.host}. Every value is checked against your page or the manufacturer’s published data${p.r.sources.length ? ` (${p.r.sources.map((s) => s.title).join(', ')})` : ''}, and nothing is estimated.`
              : 'Illustrative sample products and values. Paste your own product page above for a live enrichment.'}
          </p>
          {p?.live && !p.r.stats.meetsTarget && (
            <p className="rd-note">We could verify {p.r.stats.after} attributes ({p.r.stats.technical} technical) for this page. CatalogWiz only shows values it can confirm, so pages with richer manufacturer data give a fuller result.</p>
          )}
          {askUrl && <LiveDemoModal url={askUrl} onClose={() => setAskUrl('')} onSubmit={startLive} />}
          {children}
        </div>
      </section>
    </div>
  )
}
