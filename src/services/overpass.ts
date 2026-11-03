// Use independent instances, with a delayed backup rather than racing every mirror at once.
const ENDPOINTS = import.meta.env.PROD
  ? ['https://overpass-api.de/api', 'https://overpass.private.coffee/api']
  : ['/api/osm', '/api/overpass-mirror2']

const TIMEOUT_MS = 20_000
const BACKUP_DELAY_MS = 1000
const CACHE_TTL_MS = 10 * 60_000
const STALE_TTL_MS = 7 * 24 * 60 * 60_000
const CACHE_PREFIX = 'overpass:v2:'
const MAX_CACHE_ENTRIES = 24

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface CacheEntry {
  savedAt: number
  elements: OverpassElement[]
}

const memory = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<OverpassElement[]>>()

function validElements(value: unknown): value is OverpassElement[] {
  return Array.isArray(value) && value.every((element) => element &&
    ['node', 'way', 'relation'].includes(element.type) && Number.isFinite(element.id))
}

// Stale entries are only a fallback for progressive venue loading, never a fresh API answer.
export function cachedOverpass(query: string): (CacheEntry & { fresh: boolean }) | null {
  let entry = memory.get(query)
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + query)
    if (raw) {
      const stored = JSON.parse(raw) as CacheEntry | null
      if (stored && (!entry || stored.savedAt > entry.savedAt)) entry = stored
    }
  } catch {
    // Private mode / disabled storage: the in-memory cache still works.
  }
  if (!entry || !Number.isFinite(entry.savedAt) || !validElements(entry.elements)) return null
  const age = Date.now() - entry.savedAt
  if (age < 0 || age > STALE_TTL_MS) {
    memory.delete(query)
    try { localStorage.removeItem(CACHE_PREFIX + query) } catch { /* Storage unavailable */ }
    return null
  }
  return { ...entry, fresh: age <= CACHE_TTL_MS }
}

function writeCache(query: string, elements: OverpassElement[]) {
  const entry = { savedAt: Date.now(), elements }
  memory.delete(query)
  memory.set(query, entry)
  if (memory.size > MAX_CACHE_ENTRIES) memory.delete(memory.keys().next().value!)
  try {
    // Bound storage usage; never evict the user's favorites or another application's keys.
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(CACHE_PREFIX))
    const oldest = keys.sort((a, b) => {
      try {
        return JSON.parse(localStorage.getItem(a)!).savedAt - JSON.parse(localStorage.getItem(b)!).savedAt
      } catch { return 0 }
    })
    while (oldest.length >= MAX_CACHE_ENTRIES) localStorage.removeItem(oldest.shift()!)
    localStorage.setItem(CACHE_PREFIX + query, JSON.stringify(entry))
  } catch {
    // Quota exceeded / storage disabled: keep the in-memory answer.
  }
}

async function fetchFrom(base: string, query: string, signal: AbortSignal): Promise<OverpassElement[]> {
  const res = await fetch(`${base}/interpreter?data=${encodeURIComponent(query)}`, { signal })
  if (!res.ok) throw new Error(`OpenStreetMap : erreur ${res.status}`)
  const body = await res.json() as { elements?: unknown; remark?: string }
  // Overpass can return HTTP 200 with a runtime error and an incomplete (or empty) result.
  if (body.remark || !validElements(body.elements)) throw new Error('Réponse OpenStreetMap incomplète')
  return body.elements
}

async function request(query: string, timeoutMs: number): Promise<OverpassElement[]> {
  const controller = new AbortController()
  let backupTimer: ReturnType<typeof setTimeout> | undefined
  let settled = false
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const elements = await new Promise<OverpassElement[]>((resolve, reject) => {
      let failures = 0
      let backupStarted = false
      const launch = (base: string) => {
        void fetchFrom(base, query, controller.signal).then(resolve, () => {
          if (settled) return
          failures++
          if (!backupStarted && !controller.signal.aborted) startBackup()
          if (failures === ENDPOINTS.length) reject(new Error('Overpass unavailable'))
        })
      }
      const startBackup = () => {
        if (backupStarted) return
        backupStarted = true
        clearTimeout(backupTimer)
        launch(ENDPOINTS[1]!)
      }
      // Reject even if a fetch implementation fails to settle when aborted.
      controller.signal.addEventListener('abort', () => reject(new Error('Overpass timeout')), { once: true })
      backupTimer = setTimeout(startBackup, BACKUP_DELAY_MS)
      launch(ENDPOINTS[0]!)
    })
    writeCache(query, elements)
    return elements
  } catch {
    throw new Error('OpenStreetMap est indisponible pour cette zone. Réessaie dans un instant.')
  } finally {
    settled = true
    clearTimeout(timeout)
    clearTimeout(backupTimer)
    controller.abort()
  }
}

export function overpass(query: string, options: { timeoutMs?: number } = {}): Promise<OverpassElement[]> {
  const cached = cachedOverpass(query)
  if (cached?.fresh) return Promise.resolve(cached.elements)
  const existing = pending.get(query)
  if (existing) return existing
  const task = request(query, options.timeoutMs ?? TIMEOUT_MS).finally(() => pending.delete(query))
  pending.set(query, task)
  return task
}

export function bbox(lat: number, lng: number, radiusKm: number): string {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  return `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`
}

export function positionOf(e: OverpassElement): { lat: number; lng: number } | null {
  const p = e.center ?? (e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null)
  return p ? { lat: p.lat, lng: p.lon } : null
}
