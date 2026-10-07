import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import { fetchNearbyShowtimes, groupByMovie } from '../services/cinema'
import { withFavorites } from '../data/favorites'
import type { ListingItem } from '../services/listing'
import { fetchNearbyMuseums } from '../services/museums'
import { fetchNearbyPizzerias } from '../services/pizza'
import { fetchNearbyRestaurants } from '../services/restaurants'
import { fetchNearbyBars } from '../services/bars'
import { fetchNearbySports } from '../services/sports'
import {
  fetchNearbyEvents,
  groupByEvent,
  type TicketmasterSegment,
} from '../services/ticketmaster'
import { reverseCity } from '../services/geocoding'

// Shown when no place was typed: the position comes from the browser
const GEOLOCATION_LABEL = 'Autour de moi'
const NOT_FOUND_LABEL = 'Position introuvable'

// 'needs-address': the browser could not locate the user, searches wait for a typed address
export type LocationStatus = 'idle' | 'locating' | 'ok' | 'needs-address'
export type LocationError = 'denied' | 'unavailable' | 'timeout'

export interface ChosenPlace {
  label: string
  lat: number
  lng: number
}

// 0 is midnight, i.e. the very end of the evening
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0] as const

export const CATEGORIES = [
  { id: 'pizza', emoji: '🍕', label: 'Pizza' },
  { id: 'cinema', emoji: '🎬', label: 'Ciné' },
  { id: 'show', emoji: '🎭', label: 'Spectacle' },
  { id: 'concert', emoji: '🎵', label: 'Concert' },
] as const

export const MORE_CATEGORIES = [
  { id: 'eat', emoji: '🍝', label: 'Manger' },
  { id: 'out', emoji: '🍸', label: 'Un verre' },
  { id: 'sport', emoji: '🏃', label: 'Sport' },
  { id: 'museum', emoji: '🏛️', label: 'Musée' },
  { id: 'games', emoji: '🎮', label: 'Jouer à Mario Kart/Bomberman/...' },
] as const

export type CategoryId = ((typeof CATEGORIES)[number] | (typeof MORE_CATEGORIES)[number])['id']

// Categories that actually return results; the others are shown greyed out
const AVAILABLE_CATEGORIES: readonly CategoryId[] = ['cinema', 'show', 'concert', 'sport', 'museum', 'pizza', 'eat', 'out']
export const isAvailable = (id: CategoryId) => AVAILABLE_CATEGORIES.includes(id)

export const useSearchStore = defineStore('search', () => {
  const location = ref(GEOLOCATION_LABEL)
  // A place picked by the user; null means "use the browser's position"
  const place = ref<ChosenPlace | null>(null)
  const hour = ref<number | null>(null)
  const categories = ref<CategoryId[]>([])

  const locationStatus = ref<LocationStatus>('idle')
  const locationError = ref<LocationError | null>(null)

  // Only meaningful once a position or a place is known: searches wait for it
  const coords = ref({ lat: 0, lng: 0 })
  const cinemaListings = ref<ListingItem[]>([])
  const cinemaLoading = ref(false)
  const cinemaError = ref<string | null>(null)
  const showListings = ref<ListingItem[]>([])
  const showLoading = ref(false)
  const showError = ref<string | null>(null)
  const concertListings = ref<ListingItem[]>([])
  const concertLoading = ref(false)
  const concertError = ref<string | null>(null)
  const sportListings = ref<ListingItem[]>([])
  const sportLoading = ref(false)
  const sportError = ref<string | null>(null)
  const museumListings = ref<ListingItem[]>([])
  const museumLoading = ref(false)
  const museumError = ref<string | null>(null)
  const pizzaListings = ref<ListingItem[]>([])
  const pizzaLoading = ref(false)
  const pizzaError = ref<string | null>(null)
  const eatListings = ref<ListingItem[]>([])
  const eatLoading = ref(false)
  const eatError = ref<string | null>(null)
  const outListings = ref<ListingItem[]>([])
  const outLoading = ref(false)
  const outError = ref<string | null>(null)

  const formatHour = (h: number) => `${String(h).padStart(2, '0')}h`

  function locate(): Promise<{ coords: { lat: number; lng: number } } | { error: LocationError }> {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve({ error: 'unavailable' })
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ coords: { lat: p.coords.latitude, lng: p.coords.longitude } }),
        (e) =>
          resolve({
            error: e.code === e.PERMISSION_DENIED ? 'denied' : e.code === e.TIMEOUT ? 'timeout' : 'unavailable',
          }),
        // Accept a position up to 1 min old, but give a real fix enough time to arrive
        { timeout: 8000, maximumAge: 60_000 },
      )
    })
  }

  // "Autour de moi (Saint-Denis)": best effort, the plain label stays if the lookup fails
  async function showCity({ lat, lng }: { lat: number; lng: number }) {
    try {
      const city = await reverseCity(lat, lng)
      // Ignore a late answer once the user picked a place or the position changed
      if (city && !place.value && location.value === GEOLOCATION_LABEL) {
        location.value = `${GEOLOCATION_LABEL} (${city})`
      }
    } catch {
      // Keep the plain label
    }
  }

  // Wakes the searches waiting for an address (see `resolvePosition`)
  let wake: (() => void) | null = null

  // Finds where to search: the browser's position, or else an address typed by the user. When the
  // browser can't tell, nothing is searched (no guessed city) until a place is picked.
  async function resolvePosition(): Promise<void> {
    const began = performance.now()
    locationStatus.value = 'locating'
    const result = await locate()
    console.info(`[perf] Géolocalisation : ${Math.round(performance.now() - began)} ms`)

    if ('coords' in result) {
      coords.value = result.coords
      locationStatus.value = 'ok'
      locationError.value = null
      location.value = GEOLOCATION_LABEL
      void showCity(result.coords)
      return
    }

    locationStatus.value = 'needs-address'
    locationError.value = result.error
    location.value = NOT_FOUND_LABEL
    await new Promise<void>((resolve) => (wake = resolve))

    if (place.value) {
      coords.value = { lat: place.value.lat, lng: place.value.lng }
      return
    }
    // "Autour de moi" was asked again: retry the browser
    location.value = GEOLOCATION_LABEL
    return resolvePosition()
  }

  // Shared so that loading several lists asks for the browser position only once
  let locating: Promise<void> | null = null
  function ensureCoords() {
    // A place typed by the user wins over the browser's position
    if (place.value) {
      coords.value = { lat: place.value.lat, lng: place.value.lng }
      return Promise.resolve()
    }

    locating ??= resolvePosition()
    return locating
  }

  // Starts looking for the user's position without waiting for a search to need it
  function locateNow() {
    if (!place.value && !locating) void ensureCoords()
  }

  async function runLoad(
    items: Ref<ListingItem[]>,
    loading: Ref<boolean>,
    error: Ref<string | null>,
    // `onPartial` lets a source show a first result before its final one
    fetchItems: (onPartial: (partial: ListingItem[]) => void) => Promise<ListingItem[]>,
  ) {
    loading.value = true
    error.value = null
    items.value = []
    let hasPartial = false
    const started = performance.now()
    try {
      await ensureCoords()
      items.value = withFavorites(await fetchItems((partial) => {
        items.value = withFavorites(partial)
        hasPartial = true
        console.info(`[perf] Premier affichage : ${Math.round(performance.now() - started)} ms`)
      }))
      console.info(`[perf] Liste complète : ${Math.round(performance.now() - started)} ms`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur inconnue'
      // Keep what was already shown: a first result is better than an empty list
      if (!hasPartial) items.value = []
    } finally {
      loading.value = false
    }
  }

  const loadCinema = () =>
    runLoad(cinemaListings, cinemaLoading, cinemaError, async () => {
      const { lat, lng } = coords.value
      return groupByMovie(await fetchNearbyShowtimes(lat, lng, hour.value))
    })

  const loadTicketmaster = (
    items: Ref<ListingItem[]>,
    loading: Ref<boolean>,
    error: Ref<string | null>,
    segment: TicketmasterSegment,
  ) =>
    runLoad(items, loading, error, async () => {
      const { lat, lng } = coords.value
      return groupByEvent(await fetchNearbyEvents(lat, lng, hour.value, segment), lat, lng)
    })

  const loadShows = () => loadTicketmaster(showListings, showLoading, showError, 'Arts & Theatre')
  // Sports facilities have no schedule, so the chosen hour is not used
  const loadSport = () =>
    runLoad(sportListings, sportLoading, sportError, () =>
      fetchNearbySports(coords.value.lat, coords.value.lng),
    )
  const loadPizza = () =>
    runLoad(pizzaListings, pizzaLoading, pizzaError, (onPartial) =>
      fetchNearbyPizzerias(coords.value.lat, coords.value.lng, hour.value, onPartial),
    )
  const loadEat = () =>
    runLoad(eatListings, eatLoading, eatError, () =>
      fetchNearbyRestaurants(coords.value.lat, coords.value.lng, hour.value),
    )
  const loadOut = () =>
    runLoad(outListings, outLoading, outError, () =>
      fetchNearbyBars(coords.value.lat, coords.value.lng, hour.value),
    )
  const loadMuseums = () =>
    runLoad(museumListings, museumLoading, museumError, (onPartial) =>
      fetchNearbyMuseums(coords.value.lat, coords.value.lng, hour.value, onPartial),
    )
  const loadConcerts = () =>
    loadTicketmaster(concertListings, concertLoading, concertError, 'Music')

  // What to run for each category that has results (the others are greyed out)
  const loaders: Partial<Record<CategoryId, { load: () => Promise<void>; error: Ref<string | null> }>> = {
    cinema: { load: loadCinema, error: cinemaError },
    show: { load: loadShows, error: showError },
    concert: { load: loadConcerts, error: concertError },
    sport: { load: loadSport, error: sportError },
    museum: { load: loadMuseums, error: museumError },
    pizza: { load: loadPizza, error: pizzaError },
    eat: { load: loadEat, error: eatError },
    out: { load: loadOut, error: outError },
  }
  const started = new Map<CategoryId, { hour: number | null; done: Promise<void> }>()

  // Starts a category's search unless it already ran (or is running) for the current hour, so a
  // search begun when the category was ticked is reused when the results page opens.
  function ensureLoaded(id: CategoryId) {
    const loader = loaders[id]
    if (!loader) return
    const previous = started.get(id)
    if (previous && previous.hour === hour.value) return

    const done = loader.load().then(() => {
      // Let a failed search be retried next time
      if (loader.error.value) started.delete(id)
    })
    started.set(id, { hour: hour.value, done })
  }

  // Pick a place (or null for "around me"); every category will search again from there
  function setPlace(p: ChosenPlace | null) {
    place.value = p
    location.value = p ? p.label : GEOLOCATION_LABEL

    // Searches are waiting for an address (or a retry): let them carry on, nothing to restart
    if (wake) {
      const resume = wake
      wake = null
      if (p) locationStatus.value = 'ok'
      resume()
      return
    }

    locationStatus.value = p ? 'ok' : 'idle'
    locating = null
    started.clear()
  }

  // Coming back to the app after a failed fix (e.g. permission just granted): locate again
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !place.value && locationStatus.value === 'needs-address') {
        setPlace(null)
      }
    })
  }

  function toggleCategory(id: CategoryId) {
    const i = categories.value.indexOf(id)
    if (i === -1) {
      categories.value.push(id)
      // Slow sources (OpenStreetMap) get a head start while the user picks the rest
      ensureLoaded(id)
    } else {
      categories.value.splice(i, 1)
    }
  }

  return {
    location,
    locationStatus,
    locationError,
    locateNow,
    place,
    hour,
    categories,
    coords,
    cinemaListings,
    cinemaLoading,
    cinemaError,
    showListings,
    showLoading,
    showError,
    concertListings,
    concertLoading,
    concertError,
    sportListings,
    sportLoading,
    sportError,
    museumListings,
    museumLoading,
    museumError,
    pizzaListings,
    pizzaLoading,
    pizzaError,
    eatListings,
    eatLoading,
    eatError,
    outListings,
    outLoading,
    outError,
    formatHour,
    toggleCategory,
    ensureLoaded,
    setPlace,
  }
})
