// Places data is normalized to the same shape as OSM, without requiring a details call per card.
export interface VenueRecord {
  id: string
  lat: number
  lng: number
  tags: Record<string, string>
  source: 'geoapify' | 'openstreetmap'
}

interface CacheEntry { savedAt: number; venues: VenueRecord[] }
const PREFIX = 'geoapify:venues:v1:'
const FRESH_MS = 10 * 60_000
const STALE_MS = 7 * 24 * 60 * 60_000
const MAX_ENTRIES = 24
const REQUEST_TIMEOUT_MS = 4000
const memory = new Map<string, CacheEntry>()
const pending = new Map<string, Promise<VenueRecord[]>>()

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown) => typeof value === 'string' ? value : undefined
const numeric = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

export function parseGeoapify(body: unknown): VenueRecord[] {
  const data = object(body)
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Réponse Geoapify invalide')
  const venues = new Map<string, VenueRecord>()
  for (const feature of data.features) {
    const f = object(feature), p = object(f.properties), geometry = object(f.geometry)
    const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : []
    const lat = numeric(p.lat) ?? numeric(coordinates[1])
    const lng = numeric(p.lon) ?? numeric(coordinates[0])
    const raw = object(object(p.datasource).raw)
    const name = text(p.name) ?? text(raw.name)
    if (!name || lat === undefined || lng === undefined || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
    const categories = Array.isArray(p.categories) ? p.categories.filter((c): c is string => typeof c === 'string') : []
    const tags = Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    const type = ({ n: 'node', w: 'way', r: 'relation', node: 'node', way: 'way', relation: 'relation' } as Record<string, string>)[String(raw.osm_type)]
    const osmId = typeof raw.osm_id === 'string' ? Number(raw.osm_id) : numeric(raw.osm_id)
    const id = type && osmId && Number.isSafeInteger(osmId)
      ? `${type}/${osmId}` : text(p.place_id) ? `geoapify:${p.place_id}` : undefined
    if (!id) continue
    tags.name = name
    const has = (category: string) => categories.some((c) => c === category || c.startsWith(category + '.'))
    tags.amenity ||= text(raw.osm_key) === 'amenity' ? text(raw.osm_value) ?? '' : ''
    tags.amenity ||= has('catering.pub') ? 'pub' : has('catering.bar') ? 'bar'
      : has('catering.fast_food') ? 'fast_food' : has('catering.restaurant') ? 'restaurant' : ''
    const cuisine = text(object(p.catering).cuisine)
    tags.cuisine ||= cuisine ?? categories.flatMap((c) => {
      const match = c.match(/^catering\.(?:restaurant|fast_food)\.([^.]+)$/)
      return match ? [match[1]!] : []
    }).join(';')
    const contact = object(p.contact)
    const fields: Record<string, unknown> = {
      'addr:housenumber': p.housenumber, 'addr:street': p.street, 'addr:postcode': p.postcode,
      'addr:city': p.city, 'addr:full': p.address_line2 ?? p.formatted,
      phone: contact.phone ?? p.phone, website: p.website ?? contact.website, opening_hours: p.opening_hours,
    }
    for (const [key, value] of Object.entries(fields)) if (!tags[key] && text(value)) tags[key] = text(value)!
    if (!venues.has(id)) venues.set(id, { id, lat, lng, tags, source: 'geoapify' })
  }
  // An unrecognized non-empty response must trigger OSM, rather than falsely report no places.
  if (data.features.length && !venues.size) throw new Error('Lieux Geoapify illisibles')
  return [...venues.values()]
}

function cacheKey(categories: string[], lat: number, lng: number, radiusKm: number) {
  return `${categories.join(',')}:${lat}:${lng}:${radiusKm}`
}

export function cachedGeoapify(categories: string[], lat: number, lng: number, radiusKm: number) {
  const key = cacheKey(categories, lat, lng, radiusKm)
  let entry = memory.get(key)
  try {
    const stored = JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null') as CacheEntry | null
    if (stored && (!entry || stored.savedAt > entry.savedAt)) entry = stored
  } catch { /* Storage unavailable */ }
  if (!entry || !Number.isFinite(entry.savedAt) || !Array.isArray(entry.venues) ||
      !entry.venues.every((v) => v && typeof v.id === 'string' && numeric(v.lat) !== undefined &&
        numeric(v.lng) !== undefined && v.source === 'geoapify' && typeof v.tags?.name === 'string')) return null
  const age = Date.now() - entry.savedAt
  if (age < 0 || age > STALE_MS) {
    memory.delete(key)
    try { localStorage.removeItem(PREFIX + key) } catch { /* Storage unavailable */ }
    return null
  }
  return { ...entry, fresh: age <= FRESH_MS }
}

function save(key: string, venues: VenueRecord[]) {
  const entry = { savedAt: Date.now(), venues }
  memory.delete(key)
  memory.set(key, entry)
  if (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value!)
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).sort((a, b) => {
      try { return JSON.parse(localStorage.getItem(a)!).savedAt - JSON.parse(localStorage.getItem(b)!).savedAt } catch { return 0 }
    })
    while (keys.length >= MAX_ENTRIES) localStorage.removeItem(keys.shift()!)
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch { /* Keep the in-memory answer when storage is full or disabled */ }
}

export function fetchGeoapify(categories: string[], lat: number, lng: number, radiusKm: number): Promise<VenueRecord[]> {
  const cached = cachedGeoapify(categories, lat, lng, radiusKm)
  if (cached?.fresh) return Promise.resolve(cached.venues)
  const key = cacheKey(categories, lat, lng, radiusKm)
  const existing = pending.get(key)
  if (existing) return existing
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const params = new URLSearchParams({ categories: categories.join(','), filter: `circle:${lng},${lat},${radiusKm * 1000}`,
    bias: `proximity:${lng},${lat}`, limit: '40', lang: 'fr' })
  const task = (async () => {
    try {
      const response = await fetch(`/api/geoapify/places?${params}`, { signal: controller.signal })
      if (!response.ok) throw new Error(`Geoapify : erreur ${response.status}`)
      const venues = parseGeoapify(await response.json())
      save(key, venues)
      return venues
    } finally {
      clearTimeout(timer)
    }
  })().finally(() => pending.delete(key))
  pending.set(key, task)
  return task
}
