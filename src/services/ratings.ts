import { haversineKm, type ListingPlace } from './listing'

export interface VenueRating {
  value: number
  count: number
}

interface Review {
  signature?: string
  kid?: string
  did?: string
  original_sub?: string
  payload?: {
    sub?: string
    rating?: number
    iat?: number
    action?: string
    metadata?: { osm_id?: string }
  }
}

const CACHE_TTL_MS = 10 * 60_000
const MAX_REVIEWS = 1000
// Nearby cards share a request, including when their detail panel is opened.
const zones = new Map<string, { expiresAt: number; reviews: Promise<Review[]> }>()

const normalize = (name: string) =>
  name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function osmId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.match(/^(?:https?:\/\/(?:www\.)?openstreetmap\.org\/)?((?:node|way|relation)\/\d+)(?:\/\d+)?$/)?.[1]
}

function positionOf(subject: string | undefined) {
  if (typeof subject !== 'string' || !subject.startsWith('geo:')) return null
  try {
    const url = new URL(subject)
    const [lat, lng] = url.pathname.split(',').map(Number)
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng, name: url.searchParams.get('q') ?? '' }
  } catch {
    return null
  }
}

async function zoneReviews(lat: number, lng: number): Promise<Review[]> {
  // 0.05° tiles with a small overlap to include reviews across a tile boundary.
  const south = Math.floor(lat * 20) / 20
  const west = Math.floor(lng * 20) / 20
  const key = `${south},${west}`
  const cached = zones.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.reviews

  const entry = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    reviews: Promise.resolve([] as Review[]),
  }
  entry.reviews = (async () => {
    try {
      const bbox = [west - 0.002, south - 0.002, west + 0.052, south + 0.052].join(',')
      const params = new URLSearchParams({ bbox, limit: String(MAX_REVIEWS) })
      const response = await fetch(`/api/mangrove/reviews?${params}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error(`Mangrove: ${response.status}`)
      const body = await response.json() as { reviews?: Review[] }
      // Never present a truncated set of reviews as a complete rating.
      if (!Array.isArray(body.reviews) || body.reviews.length >= MAX_REVIEWS) throw new Error('Incomplete reviews')
      return body.reviews.filter((review) => review && typeof review === 'object')
    } catch {
      // Optional enrichment: keep results usable and avoid retrying for every card.
      entry.expiresAt = Date.now() + 60_000
      return []
    }
  })()
  if (zones.size >= 64) zones.delete(zones.keys().next().value!)
  zones.set(key, entry)
  return entry.reviews
}

export async function fetchVenueRating(name: string, place: ListingPlace): Promise<VenueRating | null> {
  if (!place.reviewable || place.lat == null || place.lng == null) return null
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null
  const reviews = await zoneReviews(place.lat, place.lng)
  const latest = new Map<string, { rating: number; timestamp: number }>()

  for (const review of reviews) {
    const payload = review.payload
    if (!payload || (payload.action && payload.action !== 'edit')) continue
    const rating = payload.rating
    if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 100) continue
    const pos = positionOf(payload.sub) ?? positionOf(review.original_sub)
    if (!pos || haversineKm(place.lat, place.lng, pos.lat, pos.lng) > 0.1) continue

    const reviewId = osmId(payload.metadata?.osm_id)
    // An explicit OSM identity wins. Without one, require both name and proximity:
    // a nearby review with no name could describe a completely different business.
    if (reviewId ? reviewId !== place.id : !pos.name || normalize(pos.name) !== normalize(name)) continue

    const author = review.did || review.kid || review.signature
    if (!author) continue
    const timestamp = typeof payload.iat === 'number' ? payload.iat : 0
    const previous = latest.get(author)
    if (!previous || timestamp > previous.timestamp) latest.set(author, { rating, timestamp })
  }

  if (!latest.size) return null
  const total = [...latest.values()].reduce((sum, review) => sum + review.rating, 0)
  // Mangrove uses 0–100; display the arithmetic mean on a 0–5 scale.
  return { value: total / latest.size / 20, count: latest.size }
}

export function googleMapsUrl(name: string, place: ListingPlace): string {
  const location = place.address || (place.lat != null && place.lng != null ? `${place.lat},${place.lng}` : place.name)
  const params = new URLSearchParams({ api: '1', query: `${name} ${location}` })
  return `https://www.google.com/maps/search/?${params}`
}
