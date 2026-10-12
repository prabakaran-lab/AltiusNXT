/* Helpers for the article page: heading anchors, table of contents and reading time. */
export const slugify = (text) => text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export const tocFor = (sections) => sections
  .filter((b) => b.type === 'heading' && b.level === 2)
  .map((b) => ({ id: slugify(b.text), text: b.text }))

const textOf = (item) => (typeof item === 'string' ? item : `${item.label} ${item.text} ${(item.items ?? []).join(' ')}`)

export function readingMinutes(sections) {
  const words = sections.map((b) => {
    if (b.text) return b.text
    if (b.items) return b.items.map(textOf).join(' ')
    return ''
  }).join(' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

const ymd = (iso) => iso.replaceAll('-', '')
export function calendarUrl(item) {
  const end = new Date(`${item.endDate}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${item.title.split(' – ')[0]} — visit AltiusNxt (${item.stand})`,
    dates: `${ymd(item.startDate)}/${ymd(end.toISOString().slice(0, 10))}`,
    location: item.venue,
    details: item.summary,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
