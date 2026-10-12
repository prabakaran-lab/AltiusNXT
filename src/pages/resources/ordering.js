/* The order shown on a listing page and used for previous/next: events by date (latest first), others as published. */
export const orderedItems = (section) => (section.key === 'events'
  ? [...section.items].sort((a, b) => b.startDate.localeCompare(a.startDate))
  : section.items)
