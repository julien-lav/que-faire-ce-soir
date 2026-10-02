// OpenStreetMap's public Overpass servers are free but often slow or overloaded (504, timeouts).
// Both servers are asked at the same time and the first answer wins.
const ENDPOINTS = ['/api/osm', '/api/overpass-mirror']
const TIMEOUT_MS = 45_000

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  // Set for ways and relations by `out center`
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// Same query again (e.g. coming back to the results page): no need to bother the servers
const cache = new Map<string, OverpassElement[]>()

export async function overpass(query: string): Promise<OverpassElement[]> {
  const cached = cache.get(query)
  if (cached) return cached

  const controllers = ENDPOINTS.map(() => new AbortController())
  const timer = setTimeout(() => controllers.forEach((c) => c.abort()), TIMEOUT_MS)

  try {
    const elements = await Promise.any(
      ENDPOINTS.map(async (base, i) => {
        const res = await fetch(`${base}/interpreter?data=${encodeURIComponent(query)}`, {
          signal: controllers[i]!.signal,
        })
        if (!res.ok) throw new Error(`OpenStreetMap: erreur ${res.status}`)
        const body: { elements: OverpassElement[] } = await res.json()
        return body.elements
      }),
    )
    cache.set(query, elements)
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
