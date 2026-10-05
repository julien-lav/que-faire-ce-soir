import type { ListingItem } from '../services/listing'
import { haversineKm } from '../services/listing'

// Favourites, written by hand. A result is a favourite when its name contains `name` and one of its
// places is within `radiusKm` of `center`, so another place with the same name elsewhere is not
// starred. Favourites come first, with a star. They only show up if the search finds them.
interface Favorite {
  name: string
  center: { lat: number; lng: number }
  radiusKm: number
}

export const FAVORITES: Favorite[] = [
  // I Briganti, Paris 14e (centre de l'arrondissement)
  { name: 'I Briganti', center: { lat: 48.833, lng: 2.326 }, radiusKm: 1.6 },
]

const simplify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const isFavorite = (item: ListingItem) =>
  FAVORITES.some(
    (f) =>
      simplify(item.title).includes(simplify(f.name)) &&
      item.places.some(
        (p) =>
          p.lat != null &&
          p.lng != null &&
          haversineKm(f.center.lat, f.center.lng, p.lat, p.lng) <= f.radiusKm,
      ),
  )

export function withFavorites(items: ListingItem[]): ListingItem[] {
  const favorites = items.filter(isFavorite).map((i) => ({ ...i, favorite: true }))
  return favorites.length ? [...favorites, ...items.filter((i) => !isFavorite(i))] : items
}
