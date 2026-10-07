import { haversineKm, sortByDistance, type ListingItem, type ListingPlace } from './listing'
import { bbox, overpass, positionOf } from './overpass'
import { hoursInfo } from './placeHours'

// Named places from OpenStreetMap (ODbL): restaurants, bars, pizzerias... One search, many kinds.

export interface VenueKind {
  // Overpass filters, without the bounding box: e.g. `"cuisine"="pizza"`
  filter: string
  // Only these `amenity` values are kept (a `cuisine` filter can match other kinds of places)
  amenities: string[]
  radiusKm: number
  // Card name when the place has no street address
  fallbackName: string
  icon: string
  tags: (t: Record<string, string>) => string[]
}

const CUISINE_LABELS: Record<string, string> = {
  italian: 'Italien',
  burger: 'Burger',
  kebab: 'Kebab',
  regional: 'Régional',
  french: 'Français',
  sandwich: 'Sandwich',
  japanese: 'Japonais',
  sushi: 'Sushi',
  chinese: 'Chinois',
  indian: 'Indien',
  thai: 'Thaï',
  vietnamese: 'Vietnamien',
  korean: 'Coréen',
  lebanese: 'Libanais',
  mexican: 'Mexicain',
  turkish: 'Turc',
  moroccan: 'Marocain',
  seafood: 'Poisson',
  steak_house: 'Grillades',
  asian: 'Asiatique',
  mediterranean: 'Méditerranéen',
  crepe: 'Crêperie',
  vegetarian: 'Végétarien',
  vegan: 'Végan',
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// OSM values can be lists ("+33 1 23; +33 4 56"): keep the first one
const firstOf = (value?: string) => value?.split(';')[0]?.trim() || undefined

const toUrl = (url?: string) =>
  url ? (/^https?:\/\//.test(url) ? url : `https://${url}`) : undefined

export function serviceTags(t: Record<string, string>): string[] {
  const tags: string[] = []
  if (t.delivery === 'yes') tags.push('Livraison')
  if (t.takeaway === 'yes' || t.takeaway === 'only') tags.push('À emporter')
  if (t.amenity === 'restaurant' && t.takeaway !== 'only') tags.push('Sur place')
  return tags
}

export function cuisineTags(t: Record<string, string>, skip: string[] = []): string[] {
  const tags: string[] = []
  for (const c of (t.cuisine ?? '').split(';')) {
    const cuisine = c.trim().toLowerCase()
    if (cuisine && !skip.includes(cuisine)) tags.push(CUISINE_LABELS[cuisine] ?? capitalize(cuisine))
  }
  return tags
}

export async function searchVenues(
  kind: VenueKind,
  lat: number,
  lng: number,
  hour: number | null,
): Promise<ListingItem[]> {
  const { radiusKm } = kind
  const query = `[out:json][timeout:40];nwr[${kind.filter}](${bbox(lat, lng, radiusKm)});out center tags;`

  // Places confirmed open come first, then the ones whose hours are missing
  const open: ListingItem[] = []
  const unknown: ListingItem[] = []

  for (const e of await overpass(query)) {
    const t = e.tags ?? {}
    const pos = positionOf(e)
    if (!t.name || !pos || !kind.amenities.includes(t.amenity ?? '')) continue

    const distanceKm = haversineKm(lat, lng, pos.lat, pos.lng)
    if (distanceKm > radiusKm) continue

    const info = t.opening_hours ? hoursInfo(t.opening_hours, hour) : null
    if (info?.closed) continue

    const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
    const city = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ')
    const hours: Partial<ListingPlace> = info?.place ?? {
      detail: 'Horaires non renseignés',
      detailIcon: '🕐',
    }

    const id = `${e.type}/${e.id}`
    ;(info?.known ? open : unknown).push({
      id,
      title: t.name,
      tags: kind.tags(t),
      places: [
        {
          id,
          name: street || kind.fallbackName,
          distanceKm,
          address: [street, city].filter(Boolean).join(', ') || undefined,
          lat: pos.lat,
          lng: pos.lng,
          phone: firstOf(t.phone ?? t['contact:phone']),
          websiteUrl: toUrl(firstOf(t.website ?? t['contact:website'])),
          times: [],
          detailIcon: kind.icon,
          ...hours,
        },
      ],
    })
  }

  return [...sortByDistance(open), ...sortByDistance(unknown)]
}
