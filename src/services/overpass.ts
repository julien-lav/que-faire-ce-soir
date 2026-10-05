// OpenStreetMap's public Overpass servers are free but often slow or overloaded (504, timeouts).
// Both servers are asked at the same time and the first answer wins.
// In dev, Vite proxies them. In production they are called straight from the browser: Overpass allows
// cross-origin requests, and it does not answer requests coming from Cloudflare Workers.
const ENDPOINTS = import.meta.env.PROD
  ? [
      'https://overpass-api.de/api',
      'https://overpass.kumi.systems/api',
      'https://overpass.private.coffee/api',
    ]
  : ['/api/osm', '/api/overpass-mirror', '/api/overpass-mirror2']
const TIMEOUT_MS = 45_000

// 429 / 502 / 503 / 504 usually mean "busy right now": trying again a moment later often works
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504])
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1500

// A repeated query (page reload, coming back to the results) is answered without any request.
// Kept in sessionStorage: it stays in this browser tab and is erased when the tab is closed.
const CACHE_TTL_MS = 10 * 60_000
const CACHE_PREFIX = 'overpass:'

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  // Set for ways and relations by `out center`
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const memory = new Map<string, OverpassElement[]>()

function readCache(query: string): OverpassElement[] | null {
  const hit = memory.get(query)
  if (hit) return hit
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + query)
    if (!raw) return null
    const { savedAt, elements } = JSON.parse(raw) as { savedAt: number; elements: OverpassElement[] }
    if (Date.now() - savedAt > CACHE_TTL_MS) return null
    memory.set(query, elements)
    return elements
  } catch {
    return null
  }
}

function writeCache(query: string, elements: OverpassElement[]) {
  memory.set(query, elements)
  try {
    sessionStorage.setItem(CACHE_PREFIX + query, JSON.stringify({ savedAt: Date.now(), elements }))
  } catch {
    // Storage full or unavailable: the in-memory copy is enough
  }
}

async function fetchFrom(
  base: string,
  query: string,
  signal: AbortSignal,
  started: number,
): Promise<OverpassElement[]> {
  const elapsed = () => Math.round(performance.now() - started)
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response | null = null
    try {
      res = await fetch(`${base}/interpreter?data=${encodeURIComponent(query)}`, { signal })
    } catch (e) {
      if (signal.aborted) throw e
      lastError = e
    }

    if (res?.ok) {
      const body: { elements: OverpassElement[] } = await res.json()
      console.info(`[perf] Overpass ${base} : ${elapsed()} ms, ${body.elements.length} éléments`)
      return body.elements
    }

    if (res) {
      lastError = new Error(`OpenStreetMap: erreur ${res.status}`)
      if (!RETRYABLE_STATUSES.has(res.status)) throw lastError
    }
    console.info(`[perf] Overpass ${base} : tentative ${attempt} échouée à ${elapsed()} ms`)

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt))
      signal.throwIfAborted()
    }
  }
  throw lastError
}

export async function overpass(query: string): Promise<OverpassElement[]> {
  const cached = readCache(query)
  if (cached) return cached

  const started = performance.now()
  const controllers = ENDPOINTS.map(() => new AbortController())
  const timer = setTimeout(() => controllers.forEach((c) => c.abort()), TIMEOUT_MS)

  try {
    const elements = await Promise.any(
      ENDPOINTS.map((base, i) => fetchFrom(base, query, controllers[i]!.signal, started)),
    )
    writeCache(query, elements)
    return elements
  } catch {
    throw new Error('OpenStreetMap est trop lent ou indisponible, réessayez dans un instant')
  } finally {
    clearTimeout(timer)
    // Cancel whichever request is still running
    controllers.forEach((c) => c.abort())
  }
}

// "south,west,north,east" box around a point. Much faster for Overpass than `around:`, which scans
// every object carrying the tag; callers still filter by exact distance afterwards.
export function bbox(lat: number, lng: number, radiusKm: number): string {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  return `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`
}

export function positionOf(e: OverpassElement): { lat: number; lng: number } | null {
  const p = e.center ?? (e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null)
  return p ? { lat: p.lat, lng: p.lon } : null
}
