import type { ListingItem, ListingPlace } from './listing'

export interface MapGroup {
  id: string
  label: string
  items: ListingItem[]
  loading: boolean
}

export interface MapEntry {
  key: string
  category: string
  activity: string
  item: ListingItem
  place: ListingPlace
}

export interface MapPoint {
  id: string
  lat: number
  lng: number
  entries: MapEntry[]
}

export function hasMapPosition(position: { lat?: number; lng?: number } | null): position is { lat: number; lng: number } {
  return position !== null && typeof position.lat === 'number' && typeof position.lng === 'number' &&
    Number.isFinite(position.lat) && Number.isFinite(position.lng) &&
    Math.abs(position.lat) <= 90 && Math.abs(position.lng) <= 180
}

// Films and events can share a venue. Group colocated entries into one accessible
// marker so each remains selectable, and ignore places without usable coordinates.
export function buildMapPlaces(groups: MapGroup[]): { points: MapPoint[]; missing: number } {
  const points = new Map<string, MapPoint>()
  const missing = new Set<string>()
  const seen = new Set<string>()
  for (const group of groups) {
    for (const item of group.items) {
      for (const place of item.places) {
        const key = `${group.id}:${item.id}:${place.id}`
        if (seen.has(key)) continue
        seen.add(key)
        if (!hasMapPosition(place)) {
          missing.add(`${group.id}:${place.id}`)
          continue
        }
        const id = `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`
        let point = points.get(id)
        if (!point) {
          point = { id, lat: place.lat, lng: place.lng, entries: [] }
          points.set(id, point)
        }
        point.entries.push({ key, category: group.id, activity: group.label, item, place })
      }
    }
  }
  return { points: [...points.values()], missing: missing.size }
}
