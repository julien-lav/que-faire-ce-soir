import { haversineKm, sortByDistance, type ListingItem, type ListingPlace, type VenueService } from './listing'
import { bbox, cachedOverpass, overpass, positionOf, type OverpassElement } from './overpass'
import { hoursInfo } from './placeHours'

// Named places from OpenStreetMap (ODbL): restaurants, bars, pizzerias... One search, many kinds.

export interface VenueKind {
  matches?: (tags: Record<string, string>) => boolean
  // Only these `amenity` values are kept (a `cuisine` filter can match other kinds of places)
  amenities: string[]
  radiusKm: number
  // Card name when the place has no street address
  fallbackName: string
  icon: string
  reviews?: boolean
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

export function venueServices(t: Record<string, string>): VenueService[] {
  const services: VenueService[] = []
  if (t.delivery === 'yes') services.push('delivery')
  if (t.takeaway === 'yes' || t.takeaway === 'only') services.push('takeaway')
  if (t.takeaway !== 'only' && t.dine_in !== 'no' &&
    (t.dine_in === 'yes' || t.amenity === 'restaurant')) services.push('dineIn')
  return services
}

export function serviceTags(t: Record<string, string>): string[] {
  const labels: Record<VenueService, string> = {
    delivery: 'Livraison', takeaway: 'À emporter', dineIn: 'Sur place',
  }
  return venueServices(t).map((service) => labels[service])
}

export function cuisineTags(t: Record<string, string>, skip: string[] = []): string[] {
  const tags: string[] = []
  for (const c of (t.cuisine ?? '').split(';')) {
    const cuisine = c.trim().toLowerCase()
    if (cuisine && !skip.includes(cuisine)) tags.push(CUISINE_LABELS[cuisine] ?? capitalize(cuisine))
  }
  return tags
}

function buildVenues(
  kind: VenueKind,
  lat: number,
  lng: number,
  hour: number | null,
  elements: OverpassElement[],
): ListingItem[] {
  const { radiusKm } = kind

  // Places confirmed open come first, then the ones whose hours are missing
  const open: ListingItem[] = []
  const unknown: ListingItem[] = []

  for (const e of elements) {
    const t = e.tags ?? {}
    const pos = positionOf(e)
    if (!t.name || !pos || !kind.amenities.includes(t.amenity ?? '') || (kind.matches && !kind.matches(t))) continue

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
          reviewable: kind.reviews,
          services: venueServices(t),
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

// All three categories share these queries, including when selected at different times.
// A small first area is cheap; the second pass covers each category's original radius.
function venueQuery(lat: number, lng: number, radiusKm: number): string {
  const area = bbox(lat, lng, radiusKm)
  const selectors = ['restaurant', 'fast_food', 'bar', 'pub']
    .map((amenity) => `nwr["amenity"="${amenity}"]["name"](${area});`).join('')
  return `[out:json][timeout:10];(${selectors});out center tags;`
}

export async function searchVenues(
  kind: VenueKind,
  lat: number,
  lng: number,
  hour: number | null,
  onPartial?: (items: ListingItem[]) => void,
): Promise<ListingItem[]> {
  const fullQuery = venueQuery(lat, lng, 2)
  const cached = cachedOverpass(fullQuery)
  let first: OverpassElement[] = []
  let partial: ListingItem[] = []

  if (cached) {
    first = cached.elements
    partial = buildVenues(kind, lat, lng, hour, first)
    if (cached.fresh) return partial
    partial = partial.map((item) => ({ ...item, tags: ['Données en cache', ...(item.tags ?? [])] }))
    onPartial?.(partial)
  } else {
    try {
      first = await overpass(venueQuery(lat, lng, 0.4), { timeoutMs: 6000 })
      partial = buildVenues(kind, lat, lng, hour, first)
      onPartial?.(partial)
    } catch {
      // A small-area failure must not prevent trying the full area.
    }
  }

  try {
    const full = await overpass(fullQuery, { timeoutMs: 12_000 })
    // Keep the first addresses visible; prefer the latest version for duplicate OSM ids.
    const merged = new Map(first.map((element) => [`${element.type}/${element.id}`, element]))
    for (const element of full) merged.set(`${element.type}/${element.id}`, element)
    return buildVenues(kind, lat, lng, hour, cached ? full : [...merged.values()])
  } catch (error) {
    if (partial.length && onPartial) {
      throw new Error(cached
        ? 'Actualisation indisponible : adresses en cache affichées. Vérifie leurs horaires avant de partir.'
        : 'Recherche élargie indisponible : les premières adresses restent affichées. Réessaie pour compléter la liste.')
    }
    throw error
  }
}
