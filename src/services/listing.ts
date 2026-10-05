// Shape shared by every "near you" list (movies, shows, ...): an item is played at several places.
export interface ListingPlace {
  id: string
  name: string
  distanceKm?: number
  // Showtimes / event times; empty for places without a schedule (e.g. sports facilities)
  times: string[]
  // Free-form line shown instead of times when there is no schedule
  detail?: string
  // Shown in the detail panel
  address?: string
  lat?: number
  lng?: number
  bookingUrl?: string
  websiteUrl?: string
  phone?: string
  // Opening-hours info for places without showtimes (museums)
  status?: { label: string; open: boolean }
  schedule?: string[]
  scheduleSource?: string
  // Emoji before `detail` (defaults to the sports facility one)
  detailIcon?: string
}

const EARTH_RADIUS_KM = 6371

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export interface ListingItem {
  id: string
  title: string
  // Hand-picked favourite (see data/favorites.ts): listed first, with a star
  favorite?: boolean
  places: ListingPlace[]
  // Shown in the detail panel
  imageUrl?: string
  description?: string
  tags?: string[]
}

const distanceOf = (p: ListingPlace) => p.distanceKm ?? Infinity

// Sorts places by distance and items by their nearest place; drops items without any place.
export function sortByDistance(items: ListingItem[]): ListingItem[] {
  const nonEmpty = items.filter((i) => i.places.length > 0)
  for (const item of nonEmpty) {
    item.places.sort((a, b) => distanceOf(a) - distanceOf(b))
    for (const p of item.places) p.times.sort()
  }
  return nonEmpty.sort((a, b) => distanceOf(a.places[0]!) - distanceOf(b.places[0]!))
}
