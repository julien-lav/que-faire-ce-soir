import { haversineKm, sortByDistance, type ListingItem, type ListingPlace } from './listing'
import { bbox, overpass, positionOf } from './overpass'
import { hoursInfo } from './placeHours'

// Pizzerias come from OpenStreetMap (ODbL): restaurants and fast-foods tagged `cuisine=*pizza*`.

const CUISINE_LABELS: Record<string, string> = {
  italian: 'Italien',
  burger: 'Burger',
  kebab: 'Kebab',
  regional: 'Régional',
  french: 'Français',
  sandwich: 'Sandwich',
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// OSM values can be lists ("+33 1 23; +33 4 56"): keep the first one
const firstOf = (value?: string) => value?.split(';')[0]?.trim() || undefined

const toUrl = (url?: string) =>
  url ? (/^https?:\/\//.test(url) ? url : `https://${url}`) : undefined

function tagsOf(t: Record<string, string>): string[] {
  const tags: string[] = []
  if (t.delivery === 'yes') tags.push('Livraison')
  if (t.takeaway === 'yes' || t.takeaway === 'only') tags.push('À emporter')
  if (t.amenity === 'restaurant' && t.takeaway !== 'only') tags.push('Sur place')

  for (const c of (t.cuisine ?? '').split(';')) {
    const cuisine = c.trim().toLowerCase()
    if (cuisine && cuisine !== 'pizza') tags.push(CUISINE_LABELS[cuisine] ?? capitalize(cuisine))
  }
  return tags
}

const RADIUS_KM = 2

// `cuisine=pizza` is an exact, indexed match: Overpass answers it much faster than the regex that
// also catches "italian;pizza". So the exact match is shown first, then replaced by the full search.
async function searchPizzerias(
  lat: number,
  lng: number,
  hour: number | null,
  exactCuisine: boolean,
): Promise<ListingItem[]> {
  const radiusKm = RADIUS_KM
  const cuisine = exactCuisine ? '"cuisine"="pizza"' : '"cuisine"~"pizza"'
  const query = `[out:json][timeout:40];nwr[${cuisine}](${bbox(lat, lng, radiusKm)});out center tags;`

  // Pizzerias confirmed open come first, then the ones whose hours are missing
  const open: ListingItem[] = []
  const unknown: ListingItem[] = []

  for (const e of await overpass(query)) {
    const t = e.tags ?? {}
    const pos = positionOf(e)
    if (!t.name || !pos || (t.amenity !== 'restaurant' && t.amenity !== 'fast_food')) continue

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
      tags: tagsOf(t),
      places: [
        {
          id,
          name: street || 'Pizzeria',
          distanceKm,
          address: [street, city].filter(Boolean).join(', ') || undefined,
          lat: pos.lat,
          lng: pos.lng,
          phone: firstOf(t.phone ?? t['contact:phone']),
          websiteUrl: toUrl(firstOf(t.website ?? t['contact:website'])),
          times: [],
          detailIcon: '🍕',
          ...hours,
        },
      ],
    })
  }

  return [...sortByDistance(open), ...sortByDistance(unknown)]
}

export async function fetchNearbyPizzerias(
  lat: number,
  lng: number,
  hour: number | null,
  onPartial?: (items: ListingItem[]) => void,
): Promise<ListingItem[]> {
  // Sequential on purpose: the public Overpass servers are easily overloaded
  const exact = await searchPizzerias(lat, lng, hour, true)
  onPartial?.(exact)

  try {
    return await searchPizzerias(lat, lng, hour, false)
  } catch {
    // The full search only adds a few more places: keep the first list rather than show an error
    return exact
  }
}
