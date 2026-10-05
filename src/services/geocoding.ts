// Place search by the Base Adresse Nationale (api-adresse.data.gouv.fr): free, no key, France only.
export interface Place {
  label: string
  // Département / region, to tell apart two places with the same name
  context: string
  lat: number
  lng: number
}

interface AddressFeature {
  properties: { label: string; context?: string }
  geometry: { coordinates: [lng: number, lat: number] }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, limit: '6', autocomplete: '1' })
  const res = await fetch(`/api/adresse/search/?${params}`, { signal })
  if (!res.ok) throw new Error(`Recherche de lieu: erreur ${res.status}`)

  const body: { features: AddressFeature[] } = await res.json()
  return body.features.map((f) => ({
    label: f.properties.label,
    context: f.properties.context ?? '',
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }))
}
