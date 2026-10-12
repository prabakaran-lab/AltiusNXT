import { useMemo, useState } from 'react'
import { ArrowRight, Braces, ChevronDown, CircleAlert, Check, Copy, Download, Table2 } from 'lucide-react'
import { ALL_CATEGORIES, CATEGORIES } from './attributeLibraryData.js'
import './SchemaLibrary.css'

/* Schema library: one real catalog product per category, shown as a spec table, JSON-LD, or CSV. */

const NUM = /^(-?\d[\d.,]*(?:\s?(?:to|-)\s?\d[\d.,]*)?)\s*([A-Za-z°%"/]{1,8})\b\s*(.*)$/

function parse(label, raw, missing) {
  const first = raw.split(' · ')[0]
  const yn = /^(yes|no)$/i.test(first)
  const m = first.match(NUM)
  const num = !yn && /^-?\d[\d.,]*$/.test(first)
  return {
    label, raw, first, missing,
    unit: m ? m[2] : '',
    type: yn ? 'Boolean' : m || num ? 'Number' : 'Text',
    num: m ? parseFloat(m[1].replace(/,/g, '')) : num ? parseFloat(first.replace(/,/g, '')) : null,
  }
}

function build(c) {
  const miss = new Set(c.miss)
  const rows = c.attrs.map(([l, v]) => parse(l, v, miss.has(l)))
  const [title, code] = c.ref.split(' · ')
  return { ...c, rows, title, code, brand: c.attrs.find(([l]) => l === 'Brand')?.[1] }
}

function jsonld(n) {
  const o = { '@context': 'https://schema.org', '@type': 'Product', name: n.title }
  if (n.brand) o.brand = { '@type': 'Brand', name: n.brand }
  if (n.code) o.mpn = n.code.replace(/\s*\(.*\)/, '')
  o.additionalProperty = n.rows.filter((r) => r.label !== 'Brand').map((r) => {
    const p = { '@type': 'PropertyValue', name: r.label, value: r.type === 'Number' && r.num != null && !Number.isNaN(r.num) ? r.num : r.type === 'Boolean' ? /^yes$/i.test(r.first) : r.first }
    if (r.unit) p.unitText = r.unit
    return p
  })
  return JSON.stringify(o, null, 2)
}

function csv(n) {
  const q = (x) => `"${String(x).replace(/"/g, '""')}"`
  return ['Attribute,Value,Unit,Data type,Often missing', ...n.rows.map((r) => [r.label, r.raw, r.unit, r.type, r.missing ? 'Yes' : 'No'].map(q).join(','))].join('\n')
}

export default function SchemaLibrary() {
  const nodes = useMemo(() => CATEGORIES.map(build), [])
  const [sel, setSel] = useState(0)
  const [view, setView] = useState('t')
  const [copied, setCopied] = useState(false)

  const n = nodes[sel]

  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv(n)], { type: 'text/csv' }))
    a.download = `${n.id}_schema.csv`
    a.click()
  }
  const copy = () => {
    try { navigator.clipboard.writeText(jsonld(n)); setCopied(true) } catch { setCopied(false) }
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="sl2" id="library" aria-labelledby="sl2-t">
      <div className="sl2-wrap">
        <header className="sl2-head">
          <h2 id="sl2-t">Example schemas for selected categories</h2>
          <p>We build comprehensive product data schemas across all industry categories. The highlighted categories serve as selected examples, showcasing the quality, depth, and precision of our work.</p>
          <ul className="cat-chips" aria-label="All industry categories">
            {ALL_CATEGORIES.map((c) => <li key={c.name} className={c.id ? 'on' : ''}>{c.name}</li>)}
          </ul>
        </header>

        <div className="sl2-lib">
          <div className="sl2-cards" role="list" aria-label="Schema categories">
            {ALL_CATEGORIES.filter((c) => c.id).map((cat) => {
              const i = nodes.findIndex((n) => n.id === cat.id)
              const x = nodes[i]
              return (
                <button type="button" role="listitem" key={cat.name} className={i === sel ? 'on' : ''} aria-current={i === sel} onClick={() => { setSel(i); setView('t') }}>
                  <b>{cat.name}</b>
                  <span>{x.rows.length} attributes<i />{x.rows.filter((r) => r.missing).length} to watch</span>
                  <u>Selected product: {x.ref}</u>
                  <em>{i === sel ? 'Viewing below' : 'View the schema'}{i === sel ? <ChevronDown size={13} /> : <ArrowRight size={13} />}</em>
                </button>
              )
            })}
          </div>

          <article className="sl2-det" aria-live="polite">
            <h3>{n.name} schema <small>{n.rows.length} attributes · {n.rows.filter((r) => r.missing).length} to watch</small></h3>
            <p className="sl2-ref">Full schema of a real product: {n.ref}</p>
            <div className="sl2-row">
              <div className="sl2-tabs" role="group" aria-label="View">
                <button type="button" aria-pressed={view === 't'} onClick={() => setView('t')}><Table2 size={14} />Spec table</button>
                <button type="button" aria-pressed={view === 'j'} onClick={() => setView('j')}><Braces size={14} />JSON-LD</button>
              </div>
                            <span className="sl2-sp" />
              <button type="button" className="sl2-btn" onClick={download}><Download size={14} />Download CSV</button>
              <button type="button" className="sl2-btn" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy JSON-LD'}</button>
            </div>

            {view === 't' ? (
              <ul className="sl2-rows">
                {n.rows.map((r) => (
                  <li key={r.label} className={`${r.missing ? 'miss' : ''}${r.raw.length > 58 ? ' wide' : ''}`}>
                    <span className="l">{r.label}</span>
                    <span className="v">{r.raw.split(' · ').join(' · ')}</span>
                    {r.missing && <em><CircleAlert size={11} />Easy to skip</em>}
                  </li>
                ))}
              </ul>
            ) : (
              <pre className="sl2-code"><code>{jsonld(n)}</code></pre>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}
