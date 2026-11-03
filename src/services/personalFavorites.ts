import type { ListingItem, ListingPlace } from './listing'

export const FAVORITE_CATEGORIES = [
  { id: 'pizza', label: '🍕 Pizzerias' },
  { id: 'eat', label: '🍝 Restaurants' },
  { id: 'out', label: '🍸 Bars' },
  { id: 'cinema', label: '🎬 Cinémas' },
  { id: 'show', label: '🎭 Salles de spectacle' },
  { id: 'concert', label: '🎵 Salles de concert' },
  { id: 'sport', label: '🏃 Lieux sportifs' },
  { id: 'museum', label: '🏛️ Musées' },
] as const

export type FavoriteCategory = typeof FAVORITE_CATEGORIES[number]['id']

export interface PersonalFavorite {
  key: string
  category: FavoriteCategory
  item: ListingItem
}

export const FAVORITES_STORAGE_KEY = 'que-faire-ce-soir:personal-favorites:v1'

export const isFavoriteCategory = (category: string): category is FavoriteCategory =>
  FAVORITE_CATEGORIES.some((entry) => entry.id === category)

export const favoriteKey = (category: FavoriteCategory, placeId: string) => `${category}:${placeId}`

const isVenueListing = (category: FavoriteCategory) => category === 'pizza' || category === 'eat' || category === 'out' || category === 'museum'

export const favoriteTitle = (category: FavoriteCategory, item: ListingItem, place: ListingPlace) =>
  isVenueListing(category) ? item.title : place.name

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value : undefined

function website(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

// Keep durable address-book fields only. Distances, daily schedules, opening
// status and booking links belong to the original search and must not be replayed.
export function createPersonalFavorite(category: FavoriteCategory, item: ListingItem, place: ListingPlace): PersonalFavorite {
  const key = favoriteKey(category, place.id)
  const title = favoriteTitle(category, item, place)
  const savedPlace: ListingPlace = {
    id: place.id,
    source: place.source,
    name: place.name,
    address: text(place.address),
    phone: text(place.phone),
    websiteUrl: website(place.websiteUrl),
    reviewable: place.reviewable === true,
    times: [],
    detail: 'Horaires à vérifier auprès du lieu',
    detailIcon: '🕐',
  }
  if (typeof place.lat === 'number' && Number.isFinite(place.lat) && Math.abs(place.lat) <= 90 &&
    typeof place.lng === 'number' && Number.isFinite(place.lng) && Math.abs(place.lng) <= 180) {
    savedPlace.lat = place.lat
    savedPlace.lng = place.lng
  }
  return {
    key,
    category,
    item: {
      id: key,
      title,
      description: isVenueListing(category) ? text(item.description) : undefined,
      tags: category === 'sport' ? [item.title] : isVenueListing(category) ? item.tags?.filter((tag) => typeof tag === 'string') : undefined,
      places: [savedPlace],
    },
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function parsePersonalFavorites(raw: string | null): PersonalFavorite[] {
  if (!raw) return []
  const data = record(JSON.parse(raw))
  if (data?.version !== 1 || !Array.isArray(data.favorites)) return []
  const unique = new Map<string, PersonalFavorite>()
  for (const value of data.favorites) {
    const entry = record(value)
    if (!entry || typeof entry.category !== 'string' || !isFavoriteCategory(entry.category)) continue
    const item = record(entry.item)
    const place = item && Array.isArray(item.places) ? record(item.places[0]) : null
    if (!item || !place || !text(item.title) || !text(place.id) || !text(place.name)) continue
    // Rebuild allowed fields rather than trusting data read from browser storage.
    const safeItem: ListingItem = {
      id: '', title: text(item.title)!, places: [], description: text(item.description),
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
    }
    const safePlace: ListingPlace = {
      source: place.source === 'geoapify' || place.source === 'openstreetmap' ? place.source : undefined,
      id: text(place.id)!, name: text(place.name)!, times: [], address: text(place.address),
      phone: text(place.phone), websiteUrl: website(place.websiteUrl), reviewable: place.reviewable === true,
      lat: typeof place.lat === 'number' ? place.lat : undefined,
      lng: typeof place.lng === 'number' ? place.lng : undefined,
    }
    const saved = createPersonalFavorite(entry.category, safeItem, safePlace)
    // Saved titles already name the venue; retain the original sports tags.
    saved.item.tags = safeItem.tags
    unique.set(saved.key, saved)
  }
  return [...unique.values()]
}

export const serializePersonalFavorites = (favorites: PersonalFavorite[]) => JSON.stringify({ version: 1, favorites })
