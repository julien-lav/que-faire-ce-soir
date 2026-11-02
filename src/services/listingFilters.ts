import type { ListingItem, VenueService } from './listing'

export interface ListingFilters {
  maxDistanceKm: number | null
  openOnly: boolean
  service: VenueService | 'all'
}

export interface FilterCapabilities {
  openingHours?: boolean
  foodServices?: boolean
}

export const defaultListingFilters = (): ListingFilters => ({
  maxDistanceKm: null,
  openOnly: false,
  service: 'all',
})

export function hasActiveFilters(filters: ListingFilters, capabilities: FilterCapabilities = {}): boolean {
  return filters.maxDistanceKm !== null ||
    (capabilities.openingHours === true && filters.openOnly) ||
    (capabilities.foodServices === true && filters.service !== 'all')
}

// Filter places as well as cards so a film's detail panel and new shortlist picks
// contain the cinemas within the chosen distance. Preserve source order and favourites.
export function filterListings(
  items: ListingItem[],
  filters: ListingFilters,
  capabilities: FilterCapabilities = {},
): ListingItem[] {
  if (!hasActiveFilters(filters, capabilities)) return items

  return items.flatMap((item) => {
    const places = item.places.filter((place) => {
      if (filters.maxDistanceKm !== null &&
        (place.distanceKm == null || !Number.isFinite(place.distanceKm) || place.distanceKm > filters.maxDistanceKm)) return false
      if (capabilities.openingHours && filters.openOnly && place.status?.open !== true) return false
      if (capabilities.foodServices && filters.service !== 'all' && !place.services?.includes(filters.service)) return false
      return true
    })
    if (!places.length) return []
    return [places.length === item.places.length ? item : { ...item, places }]
  })
}
