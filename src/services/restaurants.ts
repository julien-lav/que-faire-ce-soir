import type { ListingItem } from './listing'
import { cuisineTags, searchVenues, serviceTags, type VenueKind } from './venues'

// Restaurants other than pizzerias and burger places, which have their own list
const restaurant: VenueKind = {
  geoapifyCategories: ['catering.restaurant'],
  matches: (tags) => !/pizza|burger/.test(tags.cuisine ?? ''),
  amenities: ['restaurant'],
  radiusKm: 1.5,
  fallbackName: 'Restaurant',
  icon: '🍽️',
  reviews: true,
  tags: (t) => [...serviceTags(t), ...cuisineTags(t)],
}

export const fetchNearbyRestaurants = (
  lat: number,
  lng: number,
  hour: number | null,
  onPartial?: (items: ListingItem[]) => void,
): Promise<ListingItem[]> => searchVenues(restaurant, lat, lng, hour, onPartial)
