import { haversineKm, sortByDistance, type ListingItem, type ListingPlace } from './listing'
import { bbox, overpass, positionOf } from './overpass'
import { hoursInfo } from './placeHours'

// "Musées de France" (Muséofile, Ministère de la Culture) through data.gouv.fr's tabular API.
// The old Opendatasoft API on data.culture.gouv.fr no longer answers. The coordinates are one text
// column ("48.86, 2.35"), so the API cannot filter by distance: we fetch the user's département
// and compute distances here.
const MUSEUMS = '/api/musees'
const GEO = '/api/geo'

const PAGE_SIZE = 50
const COLUMNS = [
  'Identifiant',
  'Nom_officiel',
  'Adresse',
  'Lieu',
  'Code_postal',
  'Ville',
  'URL',
  'Domaine_thematique',
  'Atout',
  'Coordonnees',
].join(',')

interface MuseumRow {
  Identifiant: string
  Nom_officiel: string
  Adresse: string | null
  Lieu: string | null
  Code_postal: string | null
  Ville: string | null
  URL: string | null
  Domaine_thematique: string | null
  Atout: string | null
  Coordonnees: string | null
}

interface MuseumPage {
  data: MuseumRow[]
  meta: { total: number }
}

async function fetchJson<T>(url: string, errorLabel: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${errorLabel}: erreur ${res.status}`)
  return res.json()
}

// Name of the département at this position, as written in the dataset ("Paris", "Rhône"...)
async function departmentAt(lat: number, lng: number): Promise<string | null> {
  const communes = await fetchJson<{ departement?: { nom: string } }[]>(
    `${GEO}/communes?lat=${lat}&lon=${lng}&fields=departement&format=json`,
    'geo.api.gouv.fr',
  )
  return communes[0]?.departement?.nom ?? null
}

async function fetchDepartmentMuseums(department: string): Promise<MuseumRow[]> {
  const url = (page: number) => {
    const qs = new URLSearchParams({
      Departement__exact: department,
      page_size: String(PAGE_SIZE),
      page: String(page),
      columns: COLUMNS,
    })
    return `${MUSEUMS}/?${qs}`
  }

  const first = await fetchJson<MuseumPage>(url(1), 'Musées')
  const pages = Math.ceil(first.meta.total / PAGE_SIZE)
  const others = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      fetchJson<MuseumPage>(url(i + 2), 'Musées'),
    ),
  )
  return [first, ...others].flatMap((p) => p.data)
}

function parseCoordinates(value: string | null): { lat: number; lng: number } | null {
  const [lat, lng] = (value ?? '').split(',').map((s) => Number(s.trim()))
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: lat!, lng: lng! } : null
}

// The dataset often omits the scheme: "www.mahj.org/"
const toUrl = (url: string | null) => (url ? (/^https?:\/\//.test(url) ? url : `https://${url}`) : undefined)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface OsmMuseum {
  lat: number
  lng: number
  name: string
  openingHours: string
}

// Museums with opening hours in OpenStreetMap (ODbL). Best effort: coverage is uneven, and if
// Overpass is slow or down the museums are still listed, just without hours.
async function fetchOsmMuseums(lat: number, lng: number, radiusKm: number): Promise<OsmMuseum[]> {
  const query = `[out:json][timeout:40];nwr["tourism"="museum"]["opening_hours"](${bbox(lat, lng, radiusKm)});out center tags;`
  try {
    return (await overpass(query)).flatMap((e) => {
      const pos = positionOf(e)
      const openingHours = e.tags?.opening_hours
      return pos && openingHours ? [{ ...pos, name: e.tags?.name ?? '', openingHours }] : []
    })
  } catch {
    return []
  }
}

const GENERIC_WORDS = new Set(['musee', 'museum', 'maison', 'galerie'])
const nameWords = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !GENERIC_WORDS.has(w))

// Same museum if it is right there, or close and sharing a significant word of the name
function findOsmMatch(osm: OsmMuseum[], name: string, pos: { lat: number; lng: number }) {
  const words = nameWords(name)
  let best: { museum: OsmMuseum; km: number } | null = null
  for (const o of osm) {
    const km = haversineKm(pos.lat, pos.lng, o.lat, o.lng)
    const sameName = nameWords(o.name).some((w) => words.includes(w))
    const matches = km < 0.08 || (km < 0.3 && sameName)
    if (matches && (!best || km < best.km)) best = { museum: o, km }
  }
  return best?.museum
}

export async function fetchNearbyMuseums(
  lat: number,
  lng: number,
  hour: number | null,
  radiusKm = 15,
): Promise<ListingItem[]> {
  const department = await departmentAt(lat, lng)
  if (!department) return []

  const [museums, osm] = await Promise.all([
    fetchDepartmentMuseums(department),
    fetchOsmMuseums(lat, lng, radiusKm),
  ])

  // Museums confirmed open come first, then the ones whose hours are missing
  const open: ListingItem[] = []
  const unknown: ListingItem[] = []
  for (const m of museums) {
    const pos = parseCoordinates(m.Coordonnees)
    if (!pos) continue
    const distanceKm = haversineKm(lat, lng, pos.lat, pos.lng)
    if (distanceKm > radiusKm) continue

    const match = findOsmMatch(osm, m.Nom_officiel, pos)
    const info = match ? hoursInfo(match.openingHours, hour) : null
    // Only museums that are open (or whose hours we do not know) are worth listing
    if (info?.closed) continue
    const hours: Partial<ListingPlace> = info?.place ?? {
      detail: 'Horaires non renseignés',
      detailIcon: '🕐',
    }

    ;(info?.known ? open : unknown).push({
      id: m.Identifiant,
      title: capitalize(m.Nom_officiel),
      description: m.Atout ?? undefined,
      tags: (m.Domaine_thematique ?? '')
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean),
      places: [
        {
          id: m.Identifiant,
          name: m.Ville ?? 'Musée',
          distanceKm,
          address:
            [m.Lieu, [m.Adresse, m.Code_postal, m.Ville].filter(Boolean).join(' ')]
              .filter(Boolean)
              .join(', ') || undefined,
          lat: pos.lat,
          lng: pos.lng,
          websiteUrl: toUrl(m.URL),
          // Ministry data has no opening hours; they come from OpenStreetMap when it knows the museum
          times: [],
          detailIcon: '🏛️',
          ...hours,
        },
      ],
    })
  }

  return [...sortByDistance(open), ...sortByDistance(unknown)]
}
