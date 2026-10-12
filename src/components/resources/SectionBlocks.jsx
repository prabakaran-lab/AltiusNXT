import { useEffect, useRef, useState } from 'react'
import Icon from '../ui/Icon.jsx'
import { slugify } from './toc.js'

/* Renders the typed `sections` blocks from src/data/resources.js, in order.
   Labelled lists become spec-sheet rows (or a timeline when numbered); lists that carry
   percentage results are lifted into big stat figures. The original copy is never altered. */

const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const PCT = /(\d[\d,.]*)(%\+?)/
const textOf = (it) => (typeof it === 'string' ? it : it.text)
const pad = (n) => String(n + 1).padStart(2, '0')

/* Counts a figure up from zero the first time it scrolls into view. */
function Figure({ value, suffix }) {
  const target = parseFloat(value.replace(/,/g, ''))
  const [shown, setShown] = useState(target)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!el || reduce || !('IntersectionObserver' in window)) return undefined
    let frame = 0
    const io = new IntersectionObserver(([hit]) => {
      if (!hit.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 1000)
        setShown(Math.round(target * (1 - (1 - t) ** 3)))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(frame) }
  }, [target])
  return <span ref={ref} className="rs-stat-n" aria-label={`${value}${suffix}`}><span aria-hidden="true">{shown.toLocaleString()}<em>{suffix}</em></span></span>
}

function Stats({ items }) {
  return (
    <ul className="rs-stats">
      {items.map((it, n) => {
        const text = textOf(it)
        const [, value, suffix] = text.match(PCT)
        const idx = text.indexOf(`${value}${suffix}`)
        const rest = typeof it === 'string' ? text.slice(idx + value.length + suffix.length).trim() : null
        return (
          <li key={n}>
            <Figure value={value} suffix={suffix} />
            {typeof it === 'string' ? <p>{rest}</p> : <><h4>{it.label}</h4><p>{it.text}</p></>}
          </li>
        )
      })}
    </ul>
  )
}

function Specs({ items }) {
  return (
    <dl className="rs-spec">
      {items.map((it, n) => (
        <div key={n} className="rs-spec-row">
          <dt><span className="rs-spec-n">{pad(n)}</span>{it.label}</dt>
          <dd>
            {it.text}
            {it.items && (
              <ul className="rs-ticks is-compact">
                {it.items.map((sub) => <li key={sub}>{sub}</li>)}
              </ul>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Timeline({ items }) {
  return (
    <ol className="rs-timeline">
      {items.map((it, n) => (
        <li key={n}>
          <span className="rs-tl-n" aria-hidden="true">{n + 1}</span>
          <div>
            <h4><span className="visually-hidden">Step {n + 1}: </span>{it.label}</h4>
            <p>{it.text}</p>
            {it.items && (
              <ul className="rs-ticks is-compact">
                {it.items.map((sub) => <li key={sub}>{sub}</li>)}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function List({ items, numbered }) {
  const stats = items.filter((it) => PCT.test(textOf(it)))
  const labelled = items.every((it) => typeof it !== 'string')
  if (!numbered && stats.length >= 2) {
    const rest = items.filter((it) => !PCT.test(textOf(it)))
    return (
      <>
        <Stats items={stats} />
        {rest.length > 0 && (labelled ? <Specs items={rest} /> : <ul className="rs-ticks">{rest.map((it) => <li key={it}>{it}</li>)}</ul>)}
      </>
    )
  }
  if (!labelled) return <ul className="rs-ticks">{items.map((it, n) => <li key={n}>{typeof it === 'string' ? it : `${it.label}: ${it.text}`}</li>)}</ul>
  return numbered ? <Timeline items={items} /> : <Specs items={items} />
}

export default function SectionBlocks({ sections }) {
  return sections.map((block, i) => {
    const key = `${block.type}-${i}`
    switch (block.type) {
      case 'heading': {
        const Tag = `h${block.level}`
        return <Tag key={key} id={block.level === 2 ? slugify(block.text) : undefined} className="rs-heading">{block.text}</Tag>
      }
      case 'paragraph':
        return <p key={key} className={`rs-p${block.emphasis ? ' is-em' : ''}`}>{block.text}</p>
      case 'bullets':
        return <List key={key} items={block.items} />
      case 'numbered':
        return <List key={key} items={block.items} numbered />
      case 'table':
        return null // shown in the page hero as the project snapshot
      case 'quote':
        return (
          <figure key={key} className="rs-quote">
            <blockquote><p>{block.text}</p></blockquote>
            <figcaption>
              <span className="rs-avatar" aria-hidden="true">{initials(block.author)}</span>
              <span><strong>{block.author}</strong>{block.role}</span>
            </figcaption>
          </figure>
        )
      case 'banner-text':
        return (
          <aside key={key} className="rs-poster" aria-label="Event banner text">
            <span className="rs-poster-tag"><Icon name="events" size={14} /> Event banner</span>
            <p>{block.text.replace(/^Event banner:\s*/, '')}</p>
          </aside>
        )
      default:
        return null
    }
  })
}
