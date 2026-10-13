import raw from '../assets/about/global-presence-map.svg?raw'

/* The client-map SVG (see assets/about/global-presence-map.svg) with class hooks added so AboutGlobal.css can animate it:
   dots, route arcs (marching dashes), country pins, the Europe callout, the two offices and a pulse travelling each route.
   If a marker is not found the string is returned unchanged for that part, so the map still renders (just without that animation). */
function tag(svg) {
  let s = svg

  // base dot grid is the first <g>
  s = s.replace('<g><circle', '<g class="m-dots"><circle')

  // route arcs (all start at the India delivery centre)
  const arcs = []
  s = s.replace(/<g fill="none" stroke="#E8590C"([^>]*)>([\s\S]*?)<\/g>/, (m, attrs, body) => {
    const tagged = body.replace(/<path d="([^"]+)"\/>/g, (pm, d) => {
      const i = arcs.length
      arcs.push(d)
      return `<path style="--i:${i}" d="${d}"/>`
    })
    return `<g class="m-arcs" fill="none" stroke="#E8590C"${attrs}>${tagged}</g>`
  })

  // country pins
  let pin = 0
  s = s.replace(/<g><title>/g, () => `<g class="m-pin" style="--i:${pin++}"><title>`)

  // country name labels
  s = s.replace(/<text x="([\d.]+)" y="([\d.]+)" font-family="Inter,Arial,sans-serif" font-size="10\.5"/g, '<text class="m-lab" x="$1" y="$2" font-family="Inter,Arial,sans-serif" font-size="10.5"')

  // Europe callout: from its leader line up to the first office group
  const eu = s.indexOf('<line x1="514.')
  const us = s.indexOf('<g><circle cx="290.')
  if (eu > -1 && us > eu) s = `${s.slice(0, eu)}<g class="m-eu">${s.slice(eu, us)}</g>${s.slice(us)}`

  // the two office pins
  s = s.replace('<g><circle cx="290.', '<g class="m-office m-us"><circle cx="290.')
  s = s.replace('<g><circle cx="710.', '<g class="m-office m-in"><circle cx="710.')

  // a pulse travelling out along every route
  const pulses = arcs.map((d, i) => `<circle class="m-pulse" r="2.8" fill="#E8590C"><animateMotion dur="${(3 + (i % 4) * 0.35).toFixed(2)}s" begin="${(i * 0.42).toFixed(2)}s" repeatCount="indefinite" path="${d}"/></circle>`).join('')
  s = s.replace('</svg>', `<g class="m-pulses">${pulses}</g></svg>`)

  return s
}

export const MAP_SVG = tag(raw)
