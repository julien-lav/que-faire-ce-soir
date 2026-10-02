import { haversineKm, sortByDistance, type ListingItem } from './listing'

// Open data of the Ministère des Sports (Opendatasoft API, no key needed)
const BASE = '/api/sports'

// Fetched in pages of 100 (API limit). Many of the nearest ones are school gyms that get filtered out.
const EQUIPMENT_PAGES = 3
// Installations that the public cannot use
const CLOSED_INSTALLATION_TYPES = [
  'Etablissement scolaire',
  'Etablissement pénitentiaire',
  'Installation militaire',
  'CREPS ou Ecole nationale',
]
// Ids per `where ... in (...)` clause, kept small to stay under the 100-row page limit and URL limits
const ACTIVITY_CHUNK = 20
const INSTALLATION_CHUNK = 50

interface Equipment {
  numero: string
  nom: string | null
  type: string | null
  installation_numero: string | null
  acces_libre: boolean | null
  coordonnees: { lon: number; lat: number } | null
}

interface Activity {
  aps_name: string
  equip_numero: string
}

interface Installation {
  numero: string
  nom: string | null
  uai: string | null
  install_particuliere: string | null
  adresse: string | null
  cp: string | null
  commune: string | null
}

// Schools carry a UAI code, even when the installation type is not filled in
const isOpenToPublic = (i: Installation) =>
  !i.uai && !CLOSED_INSTALLATION_TYPES.includes(i.install_particuliere ?? '')

async function query<T>(dataset: string, params: Record<string, string>): Promise<T[]> {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  const res = await fetch(`${BASE}/${dataset}/records?${qs}`)
  if (!res.ok) throw new Error(`Sports.gouv: erreur ${res.status}`)
  const body: { results: T[] } = await res.json()
  return body.results
}

const inList = (ids: string[]) => `(${ids.map((id) => `"${id}"`).join(',')})`

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function fetchNearbySports(
  lat: number,
  lng: number,
  radiusKm = 3,
): Promise<ListingItem[]> {
  const point = `geom'POINT(${lng} ${lat})'`

  // 1. Nearest equipments (the only dataset with coordinates)
  const equipmentPages = await Promise.all(
    Array.from({ length: EQUIPMENT_PAGES }, (_, page) =>
      query<Equipment>('data-es-equipement', {
        select: 'numero,nom,type,installation_numero,acces_libre,coordonnees',
        where: `within_distance(coordonnees,${point},${radiusKm}km)`,
        order_by: `distance(coordonnees,${point})`,
        limit: '100',
        offset: String(page * 100),
      }),
    ),
  )
  const allEquipments = equipmentPages.flat()
  if (!allEquipments.length) return []

  // `numero` looks like "E001I751110054": the installation is the part from the "I"
  const installationOf = (e: Equipment) => e.installation_numero ?? e.numero.slice(4)

  // 2. Installations: real names, and which ones the public cannot use (schools, prisons, military)
  const installationIds = [...new Set(allEquipments.map(installationOf))]
  const installations = (
    await Promise.all(
      chunk(installationIds, INSTALLATION_CHUNK).map((ids) =>
        query<Installation>('data-es-installation', {
          select: 'numero,nom,uai,install_particuliere,adresse,cp,commune',
          where: `numero in ${inList(ids)}`,
          limit: '100',
        }),
      ),
    )
  ).flat()
  const installationById = new Map(installations.map((i) => [i.numero, i]))
  const closed = new Set(installations.filter((i) => !isOpenToPublic(i)).map((i) => i.numero))

  const equipments = allEquipments.filter((e) => !closed.has(installationOf(e)))
  if (!equipments.length) return []

  // 3. Sports practised at the remaining equipments
  const activityPages = await Promise.all(
    chunk(
      equipments.map((e) => e.numero),
      ACTIVITY_CHUNK,
    ).map((ids) =>
      query<Activity>('data-es-activite', {
        select: 'aps_name,equip_numero',
        where: `equip_numero in ${inList(ids)}`,
        limit: '100',
      }),
    ),
  )

  const equipmentById = new Map(equipments.map((e) => [e.numero, e]))

  // One item per sport, one place per installation; equipment types are collected for the detail line
  const items = new Map<string, ListingItem>()
  const types = new Map<string, Set<string>>()
  const freeAccess = new Set<string>()

  for (const a of activityPages.flat()) {
    const e = equipmentById.get(a.equip_numero)
    if (!e?.coordonnees) continue

    let item = items.get(a.aps_name)
    if (!item) {
      item = { id: a.aps_name, title: a.aps_name, places: [] }
      items.set(a.aps_name, item)
    }

    const installationId = installationOf(e)
    const distanceKm = haversineKm(lat, lng, e.coordonnees.lat, e.coordonnees.lon)
    let place = item.places.find((p) => p.id === installationId)
    if (!place) {
      const inst = installationById.get(installationId)
      place = {
        id: installationId,
        name: inst?.nom ?? e.nom ?? 'Équipement sportif',
        distanceKm,
        address: [inst?.adresse, inst?.cp, inst?.commune].filter(Boolean).join(' ') || undefined,
        lat: e.coordonnees.lat,
        lng: e.coordonnees.lon,
        times: [],
      }
      item.places.push(place)
    } else {
      place.distanceKm = Math.min(place.distanceKm ?? Infinity, distanceKm)
    }

    const key = `${a.aps_name}|${installationId}`
    if (e.type) types.set(key, (types.get(key) ?? new Set()).add(e.type))
    if (e.acces_libre) freeAccess.add(key)
  }

  for (const item of items.values()) {
    for (const place of item.places) {
      const key = `${item.id}|${place.id}`
      const parts = [...(types.get(key) ?? [])].slice(0, 2)
      if (freeAccess.has(key)) parts.push('Accès libre')
      place.detail = parts.join(' · ')
    }
  }

  return sortByDistance([...items.values()])
}
