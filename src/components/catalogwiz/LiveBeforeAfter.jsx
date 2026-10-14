import { useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, Check, ImageOff, Minus, Search, ShoppingCart, X } from 'lucide-react'
import './LiveBeforeAfter.css'

/* The visitor's own product page, before and after CatalogWiz, as one believable store page that changes state.
   Before shows the listing exactly as it was scraped (with the gaps visible); After shows the enriched page. Switching
   (or the first, automatic switch when the section scrolls into view) transforms the SAME page in place: the title,
   description, identifiers, specifications, taxonomy and the data-quality indicators animate from one state to the other.
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

/** Both states of one element share a cell, so the page never changes height; the inactive one is hidden (and not read out). */
function Swap({ before, after, k = 0, className = '' }) {
  return (
    <span className={`lba-sw ${className}`} style={{ '--k': k }}>
      <span className="b">{before}</span>
      <span className="a">{after}</span>
    </span>
  )
}

function Shell({ host, shownUrl, children }) {
  return (
    <div className="lba-page">
      <div className="lba-bar"><i /><i /><i /><span title={shownUrl}>{shownUrl}</span></div>
      <div className="lba-nav">
        <b><i />{host}</b>
        <span className="lba-find"><Search size={13} />Search products or part numbers</span>
        <ShoppingCart size={16} />
      </div>
      {children}
    </div>
  )
}

export default function LiveBeforeAfter({ r }) {
  const rootRef = useRef(null)
  const timer = useRef(0)
  const touched = useRef(false)
  const [seen, setSeen] = useState(false)
  const [mode, setMode] = useState(() => (prefersReducedMotion() ? 'after' : 'before'))
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

  // identity strip: one row per identifier, with what the page had (or a visible gap) and what CatalogWiz settled on
  const idRows = afterId.map(([label, value, own]) => ({ label, after: value, before: attrs.find((a) => a.label === own)?.before || '' }))
  // specification table: the enriched attributes (identity shown above), each with the supplier's own value or a visible gap
  const beforeMap = useMemo(() => new Map(before.map(([l, v]) => [norm(l), v])), [before])
  const specRows = useMemo(() => {
    const rows = attrs
      .filter((a) => !afterId.some((row) => row[2] === a.label))
      .map((a) => ({ label: a.label, before: a.before || beforeMap.get(norm(a.label)) || '', after: a.value, kind: !a.before ? 'add' : isTidied(a) ? 'fix' : 'same' }))
    for (const [l, v] of before) { // anything the supplier listed that the enriched record does not carry stays as it was
      if (!attrs.some((a) => norm(a.label) === norm(l)) && !beforeId.some((row) => row[2] === l)) rows.push({ label: l, before: v, after: v, kind: 'same' })
    }
    return rows
  }, [attrs, afterId, before, beforeId, beforeMap])

  // data-quality indicators, computed from the two states
  const depth = (c) => Math.max(0, c.length - 1)
  const titleImproved = norm(r.before.title) !== norm(r.after.title)
  const checks = [
    { label: 'Search-ready title', b: Boolean(r.before.title) && !titleImproved, a: Boolean(r.after.title), bd: titleImproved ? 'Supplier wording' : 'As listed', ad: 'Brand, product and key specs' },
    { label: 'Product description', b: Boolean(r.before.description), a: Boolean(r.after.description), bd: 'Missing', ad: 'Written from the datasheet' },
    { label: 'Category path', b: depth(beforeCrumbs) >= 3, a: depth(afterCrumbs) >= 3, bd: `${depth(beforeCrumbs)} level${depth(beforeCrumbs) === 1 ? '' : 's'}`, ad: `${depth(afterCrumbs)} levels` },
    { label: 'Manufacturer part number', b: beforeId.some((row) => MPN_RE.test(row[0])), a: afterId.some((row) => row[0] === 'Mfr. Part Number'), bd: 'Not stated', ad: 'Stated and checked' },
    { label: sample ? 'Human verified' : 'Checked against sources', b: false, a: sample || sources.length > 0, bd: 'No', ad: sample ? 'Signed off by a specialist' : 'Page and manufacturer data' },
  ]
  const total = Math.max(1, attrs.length)
  const count = useCount(after ? attrs.length : before.length)
  const pct = Math.round((count / total) * 100)

  /* on arrival: the original page, then one automatic switch to the enriched page; after that the visitor is in control */
  useEffect(() => {
    const f = requestAnimationFrame(() => setSeen(true))
    if (prefersReducedMotion()) return () => cancelAnimationFrame(f)
    let started = false
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        started = true
        timer.current = window.setTimeout(() => { if (!touched.current) setMode('after') }, 1700)
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

        <div className={`lba-stage${after ? ' is-after' : ''}`}>
          <Shell host={r.host} shownUrl={shownUrl}>
            <nav className="lba-bc" aria-label="Breadcrumb">
              <Swap
                before={<ol>{beforeCrumbs.map((c, i) => <li key={`${c}-${i}`}>{c}</li>)}</ol>}
                after={<ol>{afterCrumbs.map((c, i) => <li key={`${c}-${i}`}>{c}</li>)}</ol>}
              />
            </nav>

            <div className="lba-cols">
              <aside className="lba-side">
                <div className="lba-gal"><Product src={r.image} /></div>

                <nav className="lba-tax" aria-label={sample ? 'Product taxonomy' : 'Category path'}>
                  <small>{sample ? 'Taxonomy' : 'Category path'}</small>
                  <Swap
                    className="lba-tax-sw"
                    before={<span className="gap">Not classified: the supplier file only has a flat category.</span>}
                    after={taxonomy.length > 1
                      ? <ol>{taxonomy.map((t, i) => <li key={`${t}-${i}`} style={{ '--d': i }}><span>{t}</span></li>)}</ol>
                      : <span className="gap">The page states no category path.</span>}
                    k={5}
                  />
                </nav>

              </aside>

              <div className="lba-info">
                <p className="lba-brand">
                  <Swap
                    before={<em className="gap">Brand not listed</em>}
                    after={<>{afterId.find((row) => row[0] === 'Mfr. Name')?.[1] || r.host}<span className="lba-ver"><BadgeCheck size={13} />{sample ? 'Human verified' : 'Verified'}</span></>}
                    k={1}
                  />
                </p>
                <h3 className="lba-title">
                  <Swap before={<span className="raw">{r.before.title || 'No product title found'}</span>} after={r.after.title} k={0} />
                </h3>

                {idRows.length > 0 && (
                  <dl className="lba-id">
                    {idRows.map((row, i) => (
                      <div key={row.label}>
                        <dt>{row.label}</dt>
                        <dd title={row.after}>
                          {row.before && row.before === row.after
                            ? row.after
                            : <Swap before={row.before ? row.before : <em className="gap">Not listed</em>} after={row.after} k={i + 1} />}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="lba-desc">
                  <Swap
                    before={<span className={r.before.description ? '' : 'gap'}>{r.before.description || 'No product description on the page.'}</span>}
                    after={r.after.description || 'The page does not give enough detail to write a description without guessing.'}
                    k={3}
                  />
                </div>

                <div className="lba-cta"><span className="p">Request a quote</span></div>

                <section className="lba-q" aria-label="Product data quality">
                  <header>
                    <b>Data quality</b>
                    <span className={`lba-chip ${after ? 'ok' : 'bad'}`}>{after ? <Check size={10} strokeWidth={3.4} /> : null}{pct}%</span>
                  </header>
                  <div className="lba-meter" role="img" aria-label={`${count} of ${total} attributes`}>
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <p className="lba-count"><b>{count}</b> of {total} attributes{technical != null && after ? <>, {technical} technical</> : null}</p>
                  <ul className="lba-checks">
                    {checks.map((c, i) => {
                      const ok = after ? c.a : c.b
                      return (
                        <li key={c.label} style={{ '--k': i }} className={ok ? 'ok' : 'no'}>
                          <span className="ic">{ok ? <Check size={11} strokeWidth={3.4} /> : after ? <Minus size={11} strokeWidth={3.4} /> : <X size={11} strokeWidth={3.4} />}</span>
                          <span className="tx"><b>{c.label}</b><small>{after ? c.ad : c.bd}</small></span>
                        </li>
                      )
                    })}
                  </ul>
                </section>

              </div>
            </div>

            <section className="lba-card" aria-label="Specifications">
              <header>
                <b>Specifications</b>
                <span className={`lba-chip ${after ? 'ok' : 'bad'}`}>{after ? <Check size={10} strokeWidth={3.4} /> : null}{count} {after ? 'attributes' : 'listed'}</span>
              </header>
              <ul className="lba-spec">
                {specRows.map((a, i) => (
                  <li key={`${a.label}-${i}`} className={a.kind} style={{ '--k': i }}>
                    <em title={a.label}>{a.label}</em>
                    {a.kind === 'same'
                      ? <b title={a.after}>{a.after}</b>
                      : <Swap before={a.before ? <b title={a.before}>{a.before}</b> : <b className="gap">Not listed</b>} after={<b title={a.after}>{a.after}</b>} k={i} className="val" />}
                  </li>
                ))}
              </ul>
            </section>
          </Shell>
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
