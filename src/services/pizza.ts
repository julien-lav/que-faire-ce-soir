import type { ListingItem } from './listing'
import { cuisineTags, searchVenues, serviceTags, type VenueKind } from './venues'

// Pizzerias: restaurants and fast-foods tagged `cuisine=*pizza*`.

const pizzeria = (filter: string): VenueKind => ({
  filter,
  amenities: ['restaurant', 'fast_food'],
  radiusKm: 2,
  fallbackName: 'Pizzeria',
  icon: '🍕',
  tags: (t) => [...serviceTags(t), ...cuisineTags(t, ['pizza'])],
})

// `cuisine=pizza` is an exact, indexed match: Overpass answers it much faster than the regex that
// also catches "italian;pizza". So the exact match is shown first, then replaced by the full search.
export async function fetchNearbyPizzerias(
  lat: number,
  lng: number,
  hour: number | null,
  onPartial?: (items: ListingItem[]) => void,
): Promise<ListingItem[]> {
  // Sequential on purpose: the public Overpass servers are easily overloaded
  const exact = await searchVenues(pizzeria('"cuisine"="pizza"'), lat, lng, hour)
  onPartial?.(exact)

  try {
    return await searchVenues(pizzeria('"cuisine"~"pizza"'), lat, lng, hour)
  } catch {
    // The full search only adds a few more places: keep the first list rather than show an error
    return exact
  }
}
