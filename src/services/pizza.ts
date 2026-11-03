import type { ListingItem } from './listing'
import { cuisineTags, searchVenues, serviceTags, type VenueKind } from './venues'

const pizzeria: VenueKind = {
  geoapifyCategories: ['catering.restaurant.pizza', 'catering.fast_food.pizza'],
  matches: (tags) => /pizza/.test(tags.cuisine ?? ''),
  amenities: ['restaurant', 'fast_food'],
  radiusKm: 2,
  fallbackName: 'Pizzeria',
  icon: '🍕',
  reviews: true,
  tags: (tags) => [...serviceTags(tags), ...cuisineTags(tags, ['pizza'])],
}

export const fetchNearbyPizzerias = (
  lat: number,
  lng: number,
  hour: number | null,
  onPartial?: (items: ListingItem[]) => void,
): Promise<ListingItem[]> => searchVenues(pizzeria, lat, lng, hour, onPartial)
