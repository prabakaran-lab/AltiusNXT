import { useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, Check, ImageOff, Minus, Search, ShoppingCart } from 'lucide-react'
import ShotCompare from './ShotCompare.jsx'
import SampleStore from './SampleStore.jsx'
import './LiveBeforeAfter.css'

/* The visitor's own product page, before and after CatalogWiz, as two different pages of the same store.
   Before is the supplier's listing exactly as it was scraped: a plain, dated page showing only what the supplier
   provided (nothing is shown for what is missing). After is the enriched, production-quality product page. Switching
   (or the first, automatic switch when the section scrolls into view) cross-fades the two while the window resizes to fit,
   then the filled-in gaps (new attributes, taxonomy, description, identifiers) appear one after another.
   Everything shown comes from the real enrichment result for the submitted URL, or from the sample product's data. */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
// a value counts as tidied when its wording differs from what the page / supplier sent, spacing and capitalisation included
const isTidied = (a) => Boolean(a.before) && String(a.before).trim() !== String(a.value).trim()
const BRAND_RE = /^(brand|manufacturer|mfr|make)\b/i
const MPN_RE = /\b(mpn|mfr\.?\s*(part|p\/n)|manufacturer'?s?\s*(part|product))/i
const ID_RE = /\b(part|sku|mpn|model|item|catalog(?:ue)?|style|upc|ean|gtin|product code|article)\b/i

/** The identity block, in a fixed order: manufacturer name, manufacturer part number, SKU, then any other identifier
 *  (for example the seller's "Part #"). `canon` writes the first two as "Mfr. Name" and "Mfr. Part Number" (the enriched
 *  page); the original page keeps its own labels. Each row is [label shown, value, the attribute's own label]. */
function identityRows(pairs, canon = false, max = 5) {
  const slot = { name: null, mpn: null, sku: null }
  const others = []
  for (const [label, value] of pairs) {
    if (!value) continue
    if (BRAND_RE.test(label) && !slot.name) slot.name = [canon ? 'Mfr. Name' : label, value, label]
    else if (MPN_RE.test(label) && /\d/.test(value) && !slot.mpn) slot.mpn = [canon ? 'Mfr. Part Number' : label, value, label]
    else if (/^sku$/i.test(label.trim()) && !slot.sku) slot.sku = [label, value, label]
    else if (ID_RE.test(label) && /\d/.test(value) && value.length <= 40) others.push([label, value, label])
  }
  const rows = []
  const seen = new Set()
  for (const row of [slot.name, slot.mpn, slot.sku, ...others]) {
    const k = `${norm(row?.[0])}|${norm(row?.[1])}`
    if (row && !seen.has(k)) { seen.add(k); rows.push(row) }
  }
  return rows.slice(0, max)
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts smoothly to `target` (instantly when the visitor prefers reduced motion). */
function useCount(target, ms = 1100) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const a = from.current
    if (a === target) return undefined
    if (prefersReducedMotion()) {
      from.current = target
      const f = requestAnimationFrame(() => setV(target))
      return () => cancelAnimationFrame(f)
    }
    const t0 = performance.now()
    let raf = 0
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms)
      setV(Math.round(a + (target - a) * (1 - (1 - t) ** 3)))
      if (t < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); from.current = target }
  }, [target, ms])
  return v
}

function Product({ src }) {
  const [bad, setBad] = useState(false)
  if (!src || bad) return <span className="lba-noimg" role="img" aria-label="No product image found"><ImageOff size={26} /></span>
  return <img src={src} alt="" onError={() => setBad(true)} />
}

export default function LiveBeforeAfter({ r }) {
  const rootRef = useRef(null)
  const rawRef = useRef(null)
  const richRef = useRef(null)
  const timer = useRef(0)
  const touched = useRef(false)
  const [seen, setSeen] = useState(false)
  const [mode, setMode] = useState(() => (prefersReducedMotion() ? 'after' : 'before'))
  const [hs, setHs] = useState({ raw: 0, rich: 0 })
  // pictures of the visitor's real page (before as it is, after with the enrichment placed into it), when the server could take them
  const shots = r.snapshots?.before && r.snapshots?.after ? r.snapshots : null
  const after = mode === 'after'

  const attrs = r.after.attributes
  const before = r.before.attributes // [label, value] exactly as the page states them
  const cleaned = attrs.filter(isTidied)
  const added = attrs.filter((a) => !a.before)
  // The category path. A live page only has the path it states itself; a sample also carries the enriched taxonomy.
  const pagePath = useMemo(() => {
    const c = attrs.find((a) => /^category$/i.test(a.label))?.before || ''
    return c.split('>').map((x) => x.trim()).filter(Boolean)
  }, [attrs])
  const taxonomy = r.after.taxonomy || pagePath
  const beforeCrumbs = r.before.crumbs || ['Home', ...pagePath]
  const afterCrumbs = ['Home', ...taxonomy]
  const beforeId = useMemo(() => identityRows(before), [before])
  const afterId = useMemo(() => identityRows(attrs.map((a) => [a.label, a.value]), true), [attrs])
  const sample = Boolean(r.sample)
  const technical = r.stats.technical
  const sources = (r.sources || []).map((s) => s.title).slice(0, 3)
  const shownUrl = r.displayUrl || r.host

  // BEFORE: only what the supplier gave. Identifiers as plain lines, everything else in a plain table.
  const beforeGrid = before.filter(([l]) => !beforeId.some((row) => row[2] === l))
  // AFTER: identifiers in a strip, everything else in the specification table; rows CatalogWiz added are flagged
  const specRows = useMemo(() => {
    let k = 0
    const rows = attrs
      .filter((a) => !afterId.some((row) => row[2] === a.label))
      .map((a) => {
        const kind = !a.before ? 'add' : isTidied(a) ? 'fix' : 'same'
        return { label: a.label, value: a.value, kind, k: kind === 'same' ? 0 : k++ }
      })
    for (const [l, v] of before) { // anything the supplier listed that the enriched record does not carry stays as it was
      if (!attrs.some((a) => norm(a.label) === norm(l)) && !beforeId.some((row) => row[2] === l)) rows.push({ label: l, value: v, kind: 'same', k: 0 })
    }
    return rows
  }, [attrs, afterId, before, beforeId])

  // data-quality checks for the enriched page
  const depth = (c) => Math.max(0, c.length - 1)
  const checks = [
    { label: 'Search-ready title', ok: Boolean(r.after.title), note: 'Brand, product and key specs' },
    { label: 'Product description', ok: Boolean(r.after.description), note: r.after.description ? 'Written from the datasheet' : 'Not enough evidence to write one' },
    { label: 'Category path', ok: depth(afterCrumbs) >= 3, note: `${depth(afterCrumbs)} level${depth(afterCrumbs) === 1 ? '' : 's'}` },
    { label: 'Manufacturer part number', ok: afterId.some((row) => row[0] === 'Mfr. Part Number'), note: 'Stated and checked' },
    { label: sample ? 'Human verified' : 'Checked against sources', ok: sample || sources.length > 0, note: sample ? 'Signed off by a specialist' : 'Page and manufacturer data' },
  ]
  const total = Math.max(1, attrs.length)
  const count = useCount(after ? attrs.length : before.length)
  const pct = Math.round((count / total) * 100)

  /* the window is as tall as the page being shown, and resizes smoothly when the page changes */
  useEffect(() => {
    const measure = () => setHs({ raw: rawRef.current?.offsetHeight || 0, rich: richRef.current?.offsetHeight || 0 })
    measure()
    if (!('ResizeObserver' in window)) return undefined
    const ro = new ResizeObserver(measure)
    if (rawRef.current) ro.observe(rawRef.current)
    if (richRef.current) ro.observe(richRef.current)
    return () => ro.disconnect()
  }, [])
  const pageH = after ? hs.rich : hs.raw

  /* on arrival: the original page, then one automatic switch to the enriched page; after that the visitor is in control */
  useEffect(() => {
    const f = requestAnimationFrame(() => setSeen(true))
    if (prefersReducedMotion()) return () => cancelAnimationFrame(f)
    let started = false
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        started = true
        timer.current = window.setTimeout(() => { if (!touched.current) setMode('after') }, 1800)
      }
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(rootRef.current)
    return () => { cancelAnimationFrame(f); io.disconnect(); window.clearTimeout(timer.current) }
  }, [])

  const choose = (m) => { touched.current = true; window.clearTimeout(timer.current); setMode(m) }

  return (
    <section className={`lba lba-live${seen ? ' seen' : ''}`} ref={rootRef} aria-labelledby="lba-live-title">
      <div className="lba-wrap">
        <header className="lba-head">
          <p className="lba-eyebrow">Before &amp; after CatalogWiz</p>
          {sample ? (
            <>
              <h2 id="lba-live-title">Same supplier file. <em>A product page buyers can trust.</em></h2>
              <p className="lba-sub">A sample product from our catalog. Watch the raw supplier listing become the enriched, human-verified page, or switch between the two.</p>
            </>
          ) : (
            <>
              <h2 id="lba-live-title">Your product page. <em>Before and after.</em></h2>
              <p className="lba-sub">This is your own listing, read live from {r.host}. Watch it become the enriched page, or switch between the two.</p>
            </>
          )}
        </header>

        <div className="lba-toggle" role="group" aria-label="Show before or after">
          <i style={{ transform: `translateX(${after ? 100 : 0}%)` }} aria-hidden="true" />
          <button type="button" aria-pressed={!after} className={!after ? 'on' : ''} onClick={() => choose('before')}>Before</button>
          <button type="button" aria-pressed={after} className={after ? 'on after' : 'after'} onClick={() => choose('after')}>After</button>
        </div>
        <p className="lba-sr" aria-live="polite">{after ? 'Showing the enriched product page.' : 'Showing the original supplier page.'}</p>

        <div className={`lba-status${after ? ' is-after' : ''}`}>
          <span className="st-l">{after ? 'Enriched and verified' : 'Supplier listing'}</span>
          <span className="st-bar" role="img" aria-label={`${count} of ${total} attributes`}><i style={{ width: `${pct}%` }} /></span>
          <span className="st-r"><b>{count}</b> of {total} attributes<em>{pct}%</em></span>
        </div>

        <div className={`lba-stage${after ? ' is-after' : ''}`}>
          <div className="lba-bar"><i /><i /><i /><span title={shownUrl}>{shownUrl}</span></div>

          {shots ? (
            <ShotCompare shots={shots} mode={mode} host={r.host} />
          ) : r.sample ? (
            /* a sample has no real page to photograph: a store page is drawn for it, shown the same way */
            <ShotCompare mode={mode} host={r.host} beforeNode={<SampleStore r={r} variant="before" />} afterNode={<SampleStore r={r} variant="after" />} />
          ) : (
          <div className="lba-pages" style={pageH ? { height: pageH } : undefined}>
            {/* BEFORE: the supplier's own page, plain, with only what they provided */}
            <div className="lba-pg raw" ref={rawRef}>
              <div className="rw-top"><b>{r.host}</b><span>Home</span><span>Products</span><span>About us</span><span>Contact</span></div>
              <div className="rw-body">
                <p className="rw-bc">{beforeCrumbs.map((c, i) => <span key={`${c}-${i}`}>{c}</span>)}</p>
                <div className="rw-prod">
                  <div className="rw-img"><Product src={r.image} /></div>
                  <div className="rw-info">
                    <h3>{r.before.title || 'No product title found'}</h3>
                    {beforeId.map(([l, v]) => <p key={l} className="rw-line"><b>{l}:</b> {v}</p>)}
                    {r.before.description ? <p className="rw-desc">{r.before.description}</p> : null}
                    <span className="rw-btn">Request a quote</span>
                  </div>
                </div>
                <h4>Specifications</h4>
                {beforeGrid.length > 0 ? (
                  <table className="rw-spec">
                    <tbody>{beforeGrid.map(([l, v], i) => <tr key={`${l}-${i}`}><th scope="row">{l}</th><td>{v}</td></tr>)}</tbody>
                  </table>
                ) : <p className="rw-none">No specifications are listed on this page.</p>}
              </div>
              <p className="rw-foot">© {r.host}</p>
            </div>

            {/* AFTER: the enriched, production-quality page */}
            <div className="lba-pg rich" ref={richRef}>
              <div className="lba-nav">
                <b><i />{r.host}</b>
                <span className="lba-find"><Search size={13} />Search products or part numbers</span>
                <ShoppingCart size={16} />
              </div>
              <nav className="lba-bc" aria-label="Breadcrumb"><ol>{afterCrumbs.map((c, i) => <li key={`${c}-${i}`}>{c}</li>)}</ol></nav>

              <div className="lba-cols">
                <aside className="lba-side">
                  <div className="lba-gal in" style={{ '--k': 0 }}><Product src={r.image} /></div>
                  {taxonomy.length > 1 && (
                    <nav className="lba-tax in" style={{ '--k': 6 }} aria-label={sample ? 'Product taxonomy' : 'Category path'}>
                      <small>{sample ? 'Taxonomy' : 'Category path'}</small>
                      <ol>{taxonomy.map((t, i) => <li key={`${t}-${i}`} style={{ '--d': i }}><span>{t}</span></li>)}</ol>
                    </nav>
                  )}
                </aside>

                <div className="lba-info">
                  <p className="lba-brand in" style={{ '--k': 1 }}>
                    {afterId.find((row) => row[0] === 'Mfr. Name')?.[1] || r.host}
                    <span className="lba-ver"><BadgeCheck size={13} />{sample ? 'Human verified' : 'Verified'}</span>
                  </p>
                  <h3 className="lba-title in" style={{ '--k': 2 }}>{r.after.title}</h3>
                  {afterId.length > 0 && (
                    <dl className="lba-id in" style={{ '--k': 3 }}>
                      {afterId.map(([l, v]) => <div key={l}><dt>{l}</dt><dd title={v}>{v}</dd></div>)}
                    </dl>
                  )}
                  <p className="lba-desc in" style={{ '--k': 4 }}>{r.after.description || 'The page does not give enough detail to write a description without guessing.'}</p>
                  <div className="lba-cta in" style={{ '--k': 5 }}><span className="p">Request a quote</span></div>

                  <section className="lba-q in" style={{ '--k': 7 }} aria-label="Product data quality">
                    <header>
                      <b>Data quality</b>
                      <span className="lba-chip ok"><Check size={10} strokeWidth={3.4} />{technical != null ? `${technical} technical attributes` : `${attrs.length} attributes`}</span>
                    </header>
                    <ul className="lba-checks">
                      {checks.map((c, i) => (
                        <li key={c.label} style={{ '--k': i }} className={c.ok ? 'ok' : 'no'}>
                          <span className="ic">{c.ok ? <Check size={11} strokeWidth={3.4} /> : <Minus size={11} strokeWidth={3.4} />}</span>
                          <span className="tx"><b>{c.label}</b><small>{c.note}</small></span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>

              <section className="lba-card" aria-label="Specifications">
                <header>
                  <b>Specifications</b>
                  <span className="lba-chip ok"><Check size={10} strokeWidth={3.4} />{attrs.length} attributes</span>
                </header>
                <ul className="lba-spec">
                  {specRows.map((a, i) => (
                    <li key={`${a.label}-${i}`} className={`${a.kind}${a.kind === 'same' ? '' : ' in'}`} style={{ '--k': a.k }}>
                      <em title={a.label}>{a.label}</em>
                      <b title={a.value}>{a.value}</b>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
          )}
        </div>

        <ul className="lba-points">
          <li><Check size={14} strokeWidth={3} /><b>{before.length} → {attrs.length}</b> attributes{technical != null ? `, ${technical} of them technical` : ''}</li>
          <li><Check size={14} strokeWidth={3} /><b>{cleaned.length}</b> value{cleaned.length === 1 ? '' : 's'} tidied, <b>{added.length}</b> added from {sample ? 'the manufacturer datasheet' : 'verified sources'}</li>
          {sample
            ? <li><Check size={14} strokeWidth={3} /><b>Human verified</b> before it goes live</li>
            : <li><Check size={14} strokeWidth={3} /><b>Checked</b> against your page{sources.length ? ` and ${sources.join(', ')}` : ''}</li>}
        </ul>

        <details className="lba-changes">
          <summary>See every change ({cleaned.length + added.length})</summary>
          <ul>
            {cleaned.map((a, i) => <li key={`c${i}`}><u className="fix">Tidied</u><b>{a.label}</b><span><s>{a.before}</s> → {a.value}</span></li>)}
            {added.map((a, i) => <li key={`a${i}`}><u className="add">Added</u><b>{a.label}</b><span>{a.value}<small>{a.source === 'web' ? (sample ? 'manufacturer datasheet' : 'manufacturer data') : (sample ? 'supplier file' : 'your page')}</small></span></li>)}
            {!cleaned.length && !added.length && <li><span>Nothing could be added without guessing.</span></li>}
          </ul>
        </details>
      </div>
    </section>
  )
}
