import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import { fetchNearbyShowtimes, groupByMovie } from '../services/cinema'
import type { ListingItem } from '../services/listing'
import { fetchNearbySports } from '../services/sports'
import {
  fetchNearbyEvents,
  groupByEvent,
  type TicketmasterSegment,
} from '../services/ticketmaster'

// Paris 11e, used when browser geolocation is unavailable or refused
const DEFAULT_COORDS = { lat: 48.859, lng: 2.379 }

export const HOURS = [18, 19, 20, 21, 22, 23, 0] as const

export const CATEGORIES = [
  { id: 'pizza', emoji: '🍕', label: 'Pizza' },
  { id: 'cinema', emoji: '🎬', label: 'Ciné' },
  { id: 'show', emoji: '🎭', label: 'Spectacle' },
  { id: 'concert', emoji: '🎵', label: 'Concert' },
] as const

export const MORE_CATEGORIES = [
  { id: 'eat', emoji: '🍝', label: 'Manger' },
  { id: 'out', emoji: '🍸', label: 'Sortir' },
  { id: 'sport', emoji: '🏃', label: 'Sport' },
  { id: 'museum', emoji: '🏛️', label: 'Musée' },
  { id: 'games', emoji: '🎮', label: 'Jouer à Mario Kart / Bomberman' },
] as const

export type CategoryId = ((typeof CATEGORIES)[number] | (typeof MORE_CATEGORIES)[number])['id']

// Categories that actually return results; the others are shown greyed out
const AVAILABLE_CATEGORIES: readonly CategoryId[] = ['cinema', 'show', 'concert', 'sport']
export const isAvailable = (id: CategoryId) => AVAILABLE_CATEGORIES.includes(id)

export const useSearchStore = defineStore('search', () => {
  const location = ref('Paris 11e')
  const hour = ref<number | null>(null)
  const categories = ref<CategoryId[]>([])

  const coords = ref({ ...DEFAULT_COORDS })
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

  const formatHour = (h: number) => `${String(h).padStart(2, '0')}h`

  function locate(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve({ ...DEFAULT_COORDS })
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve({ ...DEFAULT_COORDS }),
        { timeout: 5000 },
      )
    })
  }

  // Shared so that loading several lists asks for the browser position only once
  let locating: Promise<void> | null = null
  function ensureCoords() {
    locating ??= locate().then((c) => {
      coords.value = c
    })
    return locating
  }

  async function runLoad(
    items: Ref<ListingItem[]>,
    loading: Ref<boolean>,
    error: Ref<string | null>,
    fetchItems: () => Promise<ListingItem[]>,
  ) {
    loading.value = true
    error.value = null
    try {
      await ensureCoords()
      items.value = await fetchItems()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur inconnue'
      items.value = []
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
  const loadConcerts = () =>
    loadTicketmaster(concertListings, concertLoading, concertError, 'Music')

  function toggleCategory(id: CategoryId) {
    const i = categories.value.indexOf(id)
    if (i === -1) categories.value.push(id)
    else categories.value.splice(i, 1)
  }

  return {
    location,
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
    formatHour,
    toggleCategory,
    loadCinema,
    loadShows,
    loadConcerts,
    loadSport,
  }
})
