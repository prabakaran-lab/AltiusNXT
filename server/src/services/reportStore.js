import { randomUUID } from 'node:crypto'

// In-memory only — reports vanish on server restart. Fine for the current demo/dev stage;
// swap for real storage (S3, disk, a DB row) before this needs to survive a redeploy.
const store = new Map()
const TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export function saveReport(buffer, filename) {
  const id = randomUUID()
  store.set(id, { buffer, filename, createdAt: Date.now() })
  return id
}

export function getReport(id) {
  const entry = store.get(id)
  if (!entry) return null
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(id)
    return null
  }
  return entry
}
