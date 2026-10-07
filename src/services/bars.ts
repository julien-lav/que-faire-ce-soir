import type { ListingItem } from './listing'
import { searchVenues, type VenueKind } from './venues'

const bar: VenueKind = {
  filter: '"amenity"~"^(bar|pub)$"]["name"',
  amenities: ['bar', 'pub'],
  radiusKm: 1.5,
  fallbackName: 'Bar',
  icon: '🍸',
  tags: (t) => {
    const tags = [t.amenity === 'pub' ? 'Pub' : 'Bar']
    if (t.outdoor_seating === 'yes') tags.push('Terrasse')
    return tags
  },
}

export const fetchNearbyBars = (
  lat: number,
  lng: number,
  hour: number | null,
): Promise<ListingItem[]> => searchVenues(bar, lat, lng, hour)
