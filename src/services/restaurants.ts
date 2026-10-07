import type { ListingItem } from './listing'
import { cuisineTags, searchVenues, serviceTags, type VenueKind } from './venues'

// Restaurants other than pizzerias and burger places, which have their own list
const restaurant: VenueKind = {
  filter: '"amenity"="restaurant"]["name"]["cuisine"!~"pizza|burger"',
  amenities: ['restaurant'],
  radiusKm: 1.5,
  fallbackName: 'Restaurant',
  icon: '🍽️',
  tags: (t) => [...serviceTags(t), ...cuisineTags(t)],
}

export const fetchNearbyRestaurants = (
  lat: number,
  lng: number,
  hour: number | null,
): Promise<ListingItem[]> => searchVenues(restaurant, lat, lng, hour)
