import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Braces, Check, Code2, Eye, Search, Sparkles, X } from 'lucide-react'
import { TESYS } from '../components/sampleProduct.js'
import SchemaLibrary from './SchemaLibrary.jsx'
import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'
import './SchemaStudio.css'

/* Schema markup explainer. The sample is a real catalog product (Schneider Electric TeSys Deca, TELGV3P73);
   the store, price and availability are demo values. */

const FIELDS = [
  { id: 'name', prop: 'name', label: 'Product title', say: 'What the product is called.' },
  { id: 'brand', prop: 'brand', label: 'Brand', say: 'Who makes it, so AI can match the right manufacturer.' },
  { id: 'mpn', prop: 'mpn', label: 'Manufacturer part number', say: 'The exact item. The number AI uses to tell look-alikes apart.' },
  { id: 'spec', prop: 'additionalProperty', label: 'Specifications', say: 'Rating, voltage, mounting: the facts buyers filter by.' },
  { id: 'price', prop: 'offers', label: 'Price and stock', say: 'What it costs and whether you can buy it today.' },
]
const CODE = [
  { t: '<script type="application/ld+json">' },
  { t: '{' },
  { t: '  "@context": "https://schema.org",' },
  { t: '  "@type": "Product",' },
  { t: `  "name": "Motor Circuit Breaker, 3P, 690 V ac, 65 kA",`, f: 'name' },
  { t: `  "brand": { "@type": "Brand", "name": "Schneider Electric" },`, f: 'brand' },
  { t: `  "mpn": "TELGV3P73",`, f: 'mpn' },
  { t: `  "sku": "TELGV3P73",`, f: 'mpn' },
  { t: '  "additionalProperty": [', f: 'spec' },
  { t: '    { "name": "Current rating", "value": "73 A" },', f: 'spec' },
  { t: '    { "name": "AC voltage rating", "value": "690 V" },', f: 'spec' },
  { t: '    { "name": "Mounting type", "value": "DIN Rail" }', f: 'spec' },
  { t: '  ],', f: 'spec' },
  { t: '  "offers": {', f: 'price' },
  { t: '    "@type": "Offer", "priceCurrency": "USD", "price": "500.00",', f: 'price' },
  { t: '    "availability": "https://schema.org/InStock"', f: 'price' },
  { t: '  }', f: 'price' },
  { t: '}' },
  { t: '</script>' },
]
const SEO_KEYWORDS = ['product schema markup', 'product schema examples', 'schema markup for ecommerce', 'product structured data', 'JSON-LD product schema']
const SEO_DATA = [breadcrumb('/product-schema-markup', 'Product Schema Markup')]
const FAQ = [
  { q: 'What is product schema markup?', a: 'Product schema markup is structured data (schema.org, usually JSON-LD) added to a product page. It labels the brand, part number, specifications, price and availability so search engines and AI tools read them as facts.' },
  { q: 'Does schema markup help SEO?', a: 'Yes. Google uses structured data to understand a page and can show richer results such as price and availability. It does not guarantee rankings, but it removes guesswork about what your page says.' },
  { q: 'Which properties matter most on an industrial product page?', a: 'name, brand, mpn, gtin, offers and additionalProperty. Identifiers (mpn, gtin) and specifications as separate name and value pairs do most of the work for B2B catalogs.' },
  { q: 'Does product schema help with UCP and AI shopping agents?', a: 'It helps. UCP (Google\'s Universal Commerce Protocol) lets AI agents compare and buy products. Agents and AI search rely on the same clean details that schema labels: brand, part number, specs, price and stock. Accurate schema needs accurate product data behind it.' },
  { q: 'Why does attribute data quality matter for schema?', a: 'Markup is only as good as the data behind it. If one product says "400A" and another "400 amp", engines and AI cannot compare them. Standardised attributes give you consistent, accurate markup at scale.' },
]
const MISTAKES = [
  { bad: 'Markup says 400 A, the page says 450 A', good: 'Markup always matches what the visitor sees' },
  { bad: '“400”, “400A”, “400 amp” across the catalog', good: 'One format and one unit for every product' },
  { bad: 'No part number or barcode, only a title', good: 'Part number and barcode on every product' },
  { bad: 'Specs only inside a text paragraph', good: 'Specs as separate name and value pairs' },
]
const LOOP = 11
const STEP = 2.0

export default function SchemaStudio() {
  const ref = useRef(null)
  const st = useRef({ t: 0, visible: false })
  const [t, setT] = useState(0)
  const [tab, setTab] = useState('with')
  const [calm] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const j = document.createElement('script')
    j.type = 'application/ld+json'
    j.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
    document.head.appendChild(j)
    return () => j.remove()
  }, [])

  useEffect(() => {
    if (calm) return undefined
    const s = st.current
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting }, { threshold: window.innerWidth < 768 ? 0.04 : 0.25 })
    io.observe(ref.current)
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (s.visible && !document.hidden) { s.t = (s.t + dt) % LOOP; acc += dt; if (acc > 0.05) { acc = 0; setT(s.t) } }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [calm])

  const idx = calm ? 0 : Math.min(FIELDS.length - 1, Math.floor(t / STEP))
  const cur = FIELDS[idx].id
  const withS = tab === 'with'

  return (
    <div className="sm">
      <PageSeo
        title="Product Schema Markup Examples for Ecommerce | AltiusNxt"
        description="See real product schema markup examples for 9 B2B categories. Learn which attributes Google and AI need, and download the JSON-LD for each."
        keywords={SEO_KEYWORDS}
        structuredData={SEO_DATA}
      />
      <section className="sm-hero">
        <div className="sm-wrap">
          <p className="sm-eyebrow">Product schema markup, explained</p>
          <h1>Buyers read your page. <em>AI reads your schema.</em></h1>
          <p className="sm-lead"><b>Product schema markup</b> is hidden code that labels your brand, part number, price and specs so Google, AI search and AI shopping agents can read them correctly. Browse real product schema examples for 9 B2B categories.</p>
          <div className="sm-act">
            <a className="btn btn-primary" href="#library">Browse the schema library <ArrowRight size={16} /></a>
            <Link className="btn btn-outline" to="/ai-readiness-report">Check my page for free</Link>
          </div>
        </div>
      </section>

      <SchemaLibrary />

      <section className="sm-see" ref={ref} aria-labelledby="sm-see-t">
        <div className="sm-wrap">
          <header className="sm-head">
            <p className="sm-eyebrow">See it</p>
            <h2 id="sm-see-t">The same page, read two ways.</h2>
            <p>Buyers see the page on the left. Search engines and AI read the labelled data on the right.</p>
          </header>

          <div className="sm-tabs" role="tablist" aria-label="What a machine reads">
            <button type="button" role="tab" aria-selected={!withS} className={!withS ? 'on' : ''} onClick={() => setTab('without')}><X size={14} />Without schema</button>
            <button type="button" role="tab" aria-selected={withS} className={withS ? 'on' : ''} onClick={() => setTab('with')}><Check size={14} />With schema</button>
          </div>

          <div className="sm-demo">
            <div className="sm-pane sm-page">
              <header><span className="dots"><i /><i /><i /></span><span className="url">store.example.com / telgv3p73</span><em><Eye size={12} />What buyers see</em></header>
              <div className="sm-pbody">
                <span className="pic"><img src={TESYS.images.front} alt="" /></span>
                <div className="info">
                  <h3 className={cur === 'name' && withS ? 'hot' : ''}>Motor Circuit Breaker, 3P, 690 V ac, 65 kA</h3>
                  <p className={`brand${cur === 'brand' && withS ? ' hot' : ''}`}>Brand: <b>Schneider Electric</b></p>
                  <p className={`mpn${cur === 'mpn' && withS ? ' hot' : ''}`}>Mfr. Part No.: <b>TELGV3P73</b></p>
                  <ul className={`spec${cur === 'spec' && withS ? ' hot' : ''}`}><li><span>Current rating</span><b>73 A</b></li><li><span>AC voltage rating</span><b>690 V</b></li><li><span>Mounting type</span><b>DIN Rail</b></li></ul>
                  <p className={`price${cur === 'price' && withS ? ' hot' : ''}`}><b>$500.00</b><span><i />In stock</span></p>
                </div>
              </div>
            </div>

            <div className="sm-flow" aria-hidden="true"><i /><span>{withS ? <Code2 size={16} /> : <Search size={16} />}</span></div>

            <div className="sm-pane sm-read">
              <header><span className="dots"><i /><i /><i /></span><span className="url">{withS ? 'What search engines and AI read' : 'What a crawler guesses'}</span><em className={withS ? 'ok' : 'bad'}>{withS ? <><Braces size={12} />JSON-LD</> : 'No markup'}</em></header>
              {withS ? (
                <>
                  <pre className="code" aria-label="Product JSON-LD example">
                    {CODE.map((l, i) => <code key={i} className={l.f ? (l.f === cur ? 'on' : 'dim') : ''}>{l.t}{'\n'}</code>)}
                  </pre>
                  <div className="sm-say"><Sparkles size={13} /><div><small>{FIELDS[idx].prop}</small><b>{FIELDS[idx].label}: {FIELDS[idx].say}</b></div></div>
                </>
              ) : (
                <div className="sm-guess">
                  <p>The crawler only sees a block of text and has to guess what each part is.</p>
                  <div className="blob">Motor Circuit Breaker, 3P, 690 V ac, 65 kA Brand: Schneider Electric Mfr. Part No.: TELGV3P73 Current rating 73 A AC voltage rating 690 V Mounting type DIN Rail $500.00 In stock</div>
                  <ul><li><X size={13} />Is “TELGV3P73” a part number, a SKU or a model name?</li><li><X size={13} />Is “690 V” a rating or a price?</li><li><X size={13} />Is the product in stock, and in what currency?</li></ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="sm-mist" aria-labelledby="sm-mist-t">
        <div className="sm-wrap">
          <header className="sm-head">
            <p className="sm-eyebrow">Get it right</p>
            <h2 id="sm-mist-t">4 product schema mistakes, and how to fix them.</h2>
          </header>
          <ul className="sm-cmp">
            {MISTAKES.map((m) => (
              <li key={m.bad}>
                <div className="bad"><X size={14} strokeWidth={3} /><span>{m.bad}</span></div>
                <div className="good"><Check size={14} strokeWidth={3} /><span>{m.good}</span></div>
              </li>
            ))}
          </ul>
          <p className="sm-note">Markup is only as good as the product data behind it. CatalogWiz standardises the attributes first, a data specialist verifies them, and the same record can feed your page markup. The example above uses a real catalog product with demo store, price and stock values.</p>
        </div>
      </section>

      <section className="sm-faq" aria-labelledby="sm-faq-t">
        <div className="sm-wrap sm-faqgrid">
          <div className="sm-faqside">
            <p className="sm-eyebrow">FAQ</p>
            <h2 id="sm-faq-t">Product schema markup: common questions.</h2>
            <p>Short answers on what schema is, what it does for search and AI, and why the data behind it matters.</p>
            <div className="sm-faqcta">
              <b>Not sure what your pages are missing?</b>
              <span>Check one product page for free and get actionable findings.</span>
              <Link className="btn btn-primary" to="/ai-readiness-report">Check my page <ArrowRight size={16} /></Link>
            </div>
          </div>
          <div className="sm-faqs">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
