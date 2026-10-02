import { sortByDistance, type ListingItem } from './listing'
import { formatLocal, getWindow } from './timeWindow'

export interface Cinema {
  id: string
  name: string
  distanceKm?: number
  address?: string | null
  city?: string | null
  lat?: number | null
  lng?: number | null
}

export interface Movie {
  id: string
  title: string
  year?: number | null
  synopsis?: string | null
  genres?: string[] | null
  posterUrl?: string | null
}

export interface Showtime {
  id: string
  startsAt: string
  movie: Movie
  cinema: Cinema
}

// startsAt is wall-clock time in the cinema's timezone, so read HH:mm from the string as-is.
const formatTime = (startsAt: string) => startsAt.slice(11, 16)

export async function fetchNearbyShowtimes(
  lat: number,
  lng: number,
  hour: number | null,
  radiusKm = 5,
): Promise<Showtime[]> {
  const { from, to } = getWindow(hour)
  const params = new URLSearchParams({
    near: `${lat},${lng}`,
    radius_km: String(radiusKm),
    include: 'movie,cinema',
    from: formatLocal(from),
    to: formatLocal(to),
    limit: '500',
  })

  const res = await fetch(`/api/cinema/showtimes?${params}`)
  if (!res.ok) throw new Error(`API Cinéma: erreur ${res.status}`)
  const body: { data: Showtime[] } = await res.json()
  return body.data
}

export function groupByMovie(showtimes: Showtime[]): ListingItem[] {
  const movies = new Map<string, ListingItem>()

  for (const s of showtimes) {
    let item = movies.get(s.movie.id)
    if (!item) {
      const m = s.movie
      item = {
        id: m.id,
        title: m.title,
        imageUrl: m.posterUrl ?? undefined,
        description: m.synopsis ?? undefined,
        tags: [...(m.year ? [String(m.year)] : []), ...(m.genres ?? [])],
        places: [],
      }
      movies.set(s.movie.id, item)
    }

    let place = item.places.find((p) => p.id === s.cinema.id)
    if (!place) {
      const c = s.cinema
      place = {
        id: c.id,
        name: c.name,
        distanceKm: c.distanceKm,
        address: [c.address, c.city].filter(Boolean).join(', ') || undefined,
        lat: c.lat ?? undefined,
        lng: c.lng ?? undefined,
        times: [],
      }
      item.places.push(place)
    }
    place.times.push(formatTime(s.startsAt))
  }

  return sortByDistance([...movies.values()])
}
