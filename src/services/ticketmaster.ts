import { haversineKm, sortByDistance, type ListingItem } from './listing'
import { getWindow } from './timeWindow'

interface TicketmasterVenue {
  id: string
  name: string
  location?: { latitude: string; longitude: string }
  distance?: number
  address?: { line1?: string }
  city?: { name?: string }
  postalCode?: string
}

export interface TicketmasterEvent {
  id: string
  name: string
  url?: string
  info?: string
  images?: { url: string; width?: number; ratio?: string }[]
  classifications?: { genre?: { name?: string }; subGenre?: { name?: string } }[]
  dates: { start: { dateTime?: string }; timezone?: string }
  _embedded?: { venues?: TicketmasterVenue[] }
}

// Widest 16:9 image that is not huge, to keep the panel light
function pickImage(images: TicketmasterEvent['images']): string | undefined {
  const wide = (images ?? []).filter((i) => i.ratio === '16_9' && (i.width ?? 0) >= 640)
  wide.sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
  return wide[0]?.url ?? images?.[0]?.url
}

const meaningful = (name?: string) => (name && name !== 'Undefined' ? name : undefined)

// Ticketmaster rejects milliseconds: "2026-10-02T18:00:00Z"
const toTicketmasterDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z')

export type TicketmasterSegment = 'Arts & Theatre' | 'Music'

export async function fetchNearbyEvents(
  lat: number,
  lng: number,
  hour: number | null,
  segment: TicketmasterSegment,
  radiusKm = 10,
): Promise<TicketmasterEvent[]> {
  const { from, to } = getWindow(hour)
  const params = new URLSearchParams({
    latlong: `${lat},${lng}`,
    radius: String(radiusKm),
    unit: 'km',
    segmentName: segment,
    startDateTime: toTicketmasterDate(from),
    endDateTime: toTicketmasterDate(to),
    locale: '*',
    size: '200',
    sort: 'distance,asc',
  })

  const res = await fetch(`/api/ticketmaster/events.json?${params}`)
  if (res.status === 401) throw new Error('Ticketmaster: clé API invalide ou absente (401)')
  if (!res.ok) throw new Error(`Ticketmaster: erreur ${res.status}`)
  const body: { _embedded?: { events: TicketmasterEvent[] } } = await res.json()
  // No match: the API omits _embedded entirely
  return body._embedded?.events ?? []
}

export function groupByEvent(events: TicketmasterEvent[], lat: number, lng: number): ListingItem[] {
  const shows = new Map<string, ListingItem>()

  for (const e of events) {
    const venue = e._embedded?.venues?.[0]
    const start = e.dates.start.dateTime
    if (!venue || !start) continue

    const time = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: e.dates.timezone ?? 'Europe/Paris',
    }).format(new Date(start))

    // The same show is listed once per date, so group by name
    let item = shows.get(e.name)
    if (!item) {
      const c = e.classifications?.[0]
      item = {
        id: e.name,
        title: e.name,
        imageUrl: pickImage(e.images),
        description: e.info,
        tags: [meaningful(c?.genre?.name), meaningful(c?.subGenre?.name)].filter(
          (t): t is string => !!t,
        ),
        places: [],
      }
      shows.set(e.name, item)
    }

    let place = item.places.find((p) => p.id === venue.id)
    if (!place) {
      const distanceKm = venue.location
        ? haversineKm(lat, lng, Number(venue.location.latitude), Number(venue.location.longitude))
        : venue.distance
      place = {
        id: venue.id,
        name: venue.name,
        distanceKm,
        address: [venue.address?.line1, venue.postalCode, venue.city?.name]
          .filter(Boolean)
          .join(' ') || undefined,
        lat: venue.location ? Number(venue.location.latitude) : undefined,
        lng: venue.location ? Number(venue.location.longitude) : undefined,
        // Each date has its own page; the first one is enough to reach the ticket office
        bookingUrl: e.url,
        times: [],
      }
      item.places.push(place)
    }
    if (!place.times.includes(time)) place.times.push(time)
  }

  return sortByDistance([...shows.values()])
}
