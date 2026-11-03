<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import LocationPicker from '../components/LocationPicker.vue'
import ListingList from '../components/ListingList.vue'
import ListingFilters from '../components/ListingFilters.vue'
import ShortlistBar from '../components/ShortlistBar.vue'
import { useShortlistStore } from '../stores/shortlist'
import { activityLabel, useSearchStore } from '../stores/search'
import { defaultListingFilters, filterListings, hasActiveFilters } from '../services/listingFilters'
import type { MapGroup } from '../services/mapPlaces'

const ResultsMap = defineAsyncComponent(() => import('../components/ResultsMap.vue'))

const search = useSearchStore()
const route = useRoute()
const isSurprise = computed(() => route.query.mode === 'surprise')
const shortlist = useShortlistStore()
const showFilters = ref(false)
const showMap = ref(false)

const hasCinema = computed(() => search.categories.includes('cinema'))
const hasShow = computed(() => search.categories.includes('show'))
const hasConcert = computed(() => search.categories.includes('concert'))
const hasSport = computed(() => search.categories.includes('sport'))
const hasMuseum = computed(() => search.categories.includes('museum'))
const hasPizza = computed(() => search.categories.includes('pizza'))
const hasEat = computed(() => search.categories.includes('eat'))
const hasOut = computed(() => search.categories.includes('out'))
const foodServices = computed(() => hasPizza.value || hasEat.value)
const openingHours = computed(() => foodServices.value || hasOut.value || hasMuseum.value)
const filtersActive = computed(() => hasActiveFilters(search.filters, {
  foodServices: foodServices.value,
  openingHours: openingHours.value && search.hour !== null,
}))
const venueCapabilities = computed(() => ({ openingHours: search.hour !== null }))
const foodCapabilities = computed(() => ({ ...venueCapabilities.value, foodServices: true }))
const foodFiltered = computed(() => hasActiveFilters(search.filters, foodCapabilities.value))
const venueFiltered = computed(() => hasActiveFilters(search.filters, venueCapabilities.value))
const distanceFiltered = computed(() => hasActiveFilters(search.filters))
const pizza = computed(() => filterListings(search.pizzaListings, search.filters, foodCapabilities.value))
const eat = computed(() => filterListings(search.eatListings, search.filters, foodCapabilities.value))
const out = computed(() => filterListings(search.outListings, search.filters, venueCapabilities.value))
const museums = computed(() => filterListings(search.museumListings, search.filters, venueCapabilities.value))
const cinema = computed(() => filterListings(search.cinemaListings, search.filters))
const shows = computed(() => filterListings(search.showListings, search.filters))
const concerts = computed(() => filterListings(search.concertListings, search.filters))
const sports = computed(() => filterListings(search.sportListings, search.filters))
const resetFilters = () => { search.filters = defaultListingFilters() }
const mapGroups = computed<MapGroup[]>(() => [
  { id: 'pizza', label: activityLabel('pizza'), items: pizza.value, loading: search.pizzaLoading },
  { id: 'eat', label: activityLabel('eat'), items: eat.value, loading: search.eatLoading },
  { id: 'out', label: activityLabel('out'), items: out.value, loading: search.outLoading },
  { id: 'cinema', label: activityLabel('cinema'), items: cinema.value, loading: search.cinemaLoading },
  { id: 'show', label: activityLabel('show'), items: shows.value, loading: search.showLoading },
  { id: 'concert', label: activityLabel('concert'), items: concerts.value, loading: search.concertLoading },
  { id: 'sport', label: activityLabel('sport'), items: sports.value, loading: search.sportLoading },
  { id: 'museum', label: activityLabel('museum'), items: museums.value, loading: search.museumLoading },
].filter((group) => search.categories.some((category) => category === group.id)))
const mapCenter = computed(() => search.locationStatus === 'ok' ? search.coords : null)
const listCount = computed(
  () =>
    [
      hasPizza.value,
      hasCinema.value,
      hasShow.value,
      hasConcert.value,
      hasSport.value,
      hasMuseum.value,
      hasEat.value,
      hasOut.value,
    ].filter(Boolean).length,
)

// One column per chosen list on desktop (full class names so Tailwind can see them); stacked on mobile
const GRID_CLASSES: Record<number, string> = {
  1: 'md:max-w-md md:grid-cols-1',
  2: 'md:max-w-3xl md:grid-cols-2',
  3: 'md:max-w-6xl md:grid-cols-2 xl:grid-cols-3',
  4: 'md:max-w-7xl md:grid-cols-2 xl:grid-cols-4',
  5: 'md:max-w-[90rem] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5',
  6: 'md:max-w-[90rem] md:grid-cols-2 xl:grid-cols-3',
  7: 'md:max-w-[90rem] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
  8: 'md:max-w-[90rem] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
}

// Searches may already be running (or done) since the categories were ticked
onMounted(() => search.categories.forEach((id) => search.ensureLoaded(id)))
</script>

<template>
  <main
    :class="shortlist.count > 0 ? 'pb-44' : 'pb-8 sm:pb-10'"
    class="page-shell flex flex-col items-center justify-center gap-6 px-4 pt-8 sm:px-6 sm:pt-10 text-center text-white"
  >
    <p class="text-white/70">
      {{ search.location }} · {{ search.hour !== null ? search.formatHour(search.hour) : '' }}
    </p>

    <LocationPicker v-if="search.locationStatus === 'needs-address' || search.locationStatus === 'locating'" />

    <section v-if="isSurprise && listCount > 0" class="flex w-full max-w-xl flex-col items-center gap-3">
      <h1 class="text-2xl font-bold sm:text-3xl">✨ Ton idée de sortie</h1>
      <p class="text-white/70">Un repas, puis une sortie : découvre les adresses et les séances près de toi.</p>
      <p class="font-semibold text-fuchsia-200">{{ search.categories.map(activityLabel).join(' + ') }}</p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          class="rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-5 py-3 font-bold transition hover:scale-105"
          @click="search.startSurprise()"
        >
          ✨ Une autre idée
        </button>
        <RouterLink :to="{ name: 'choose' }" class="rounded-full border border-white/30 px-5 py-3 transition hover:bg-white/10">
          Choisir mes activités
        </RouterLink>
      </div>
    </section>

    <div v-if="listCount > 0" class="w-full max-w-md text-left md:max-w-3xl">
      <div class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          :aria-expanded="showFilters"
          aria-controls="listing-filters-panel"
          class="flex min-w-0 flex-wrap items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400 sm:justify-start sm:px-4"
          @click="showFilters = !showFilters"
        >
          {{ showFilters ? 'Masquer les filtres' : 'Afficher les filtres' }}
          <span v-if="filtersActive" class="rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-xs text-fuchsia-200">Filtres actifs</span>
          <span aria-hidden="true">{{ showFilters ? '▴' : '▾' }}</span>
        </button>
        <button
          type="button"
          :aria-expanded="showMap"
          aria-controls="listing-map-panel"
          class="flex min-w-0 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400 sm:justify-start sm:px-4"
          @click="showMap = !showMap"
        >
          <span aria-hidden="true">🗺️</span>
          <span>{{ showMap ? 'Masquer la carte' : 'Afficher la carte' }}</span>
        </button>
      </div>
      <ListingFilters
        v-show="showFilters"
        id="listing-filters-panel"
        v-model="search.filters"
        class="mt-3"
        :food-services="foodServices"
        :opening-hours="openingHours"
        :hour="search.hour"
      />
    </div>

    <div v-if="listCount > 0" v-show="showMap" id="listing-map-panel" class="w-full max-w-6xl">
      <Suspense v-if="showMap">
        <ResultsMap :groups="mapGroups" :center="mapCenter" />
        <template #fallback><p role="status" class="py-6 text-white/60">Chargement de la carte…</p></template>
      </Suspense>
    </div>

    <div
      v-if="listCount > 0"
      class="grid w-full max-w-md grid-cols-1 items-start gap-8"
      :class="GRID_CLASSES[listCount]"
    >
      <ListingList
        v-if="hasPizza"
        slow-source
        :activity="activityLabel('pizza')"
        title="🍕 Pizzerias près de vous"
        favorite-category="pizza"
        :items="pizza"
        :filtered="foodFiltered"
        :total-count="search.pizzaListings.length"
        @reset-filters="resetFilters"
        :loading="search.pizzaLoading"
        :error="search.pizzaError"
        :limit="12"
        loading-text="Recherche des pizzerias…"
        empty-text="Aucune pizzeria trouvée près de vous."
      />
      <ListingList
        v-if="hasEat"
        slow-source
        :activity="activityLabel('eat')"
        title="🍝 Restaurants près de vous"
        favorite-category="eat"
        :items="eat"
        :filtered="foodFiltered"
        :total-count="search.eatListings.length"
        @reset-filters="resetFilters"
        :loading="search.eatLoading"
        :error="search.eatError"
        :limit="12"
        loading-text="Recherche des restaurants…"
        empty-text="Aucun restaurant trouvé près de vous."
      />
      <ListingList
        v-if="hasOut"
        slow-source
        :activity="activityLabel('out')"
        title="🍸 Bars près de vous"
        favorite-category="out"
        :items="out"
        :filtered="venueFiltered"
        :total-count="search.outListings.length"
        @reset-filters="resetFilters"
        :loading="search.outLoading"
        :error="search.outError"
        :limit="12"
        loading-text="Recherche des bars…"
        empty-text="Aucun bar trouvé près de vous."
      />
      <ListingList
        v-if="hasCinema"
        searchable
        :activity="activityLabel('cinema')"
        title="🎬 Cinéma près de vous"
        favorite-category="cinema"
        :items="cinema"
        :filtered="distanceFiltered"
        :total-count="search.cinemaListings.length"
        @reset-filters="resetFilters"
        :loading="search.cinemaLoading"
        :error="search.cinemaError"
        loading-text="Recherche des séances…"
        empty-text="Aucune séance trouvée près de vous."
      />
      <ListingList
        v-if="hasShow"
        searchable
        :activity="activityLabel('show')"
        title="🎭 Spectacles près de vous"
        favorite-category="show"
        :items="shows"
        :filtered="distanceFiltered"
        :total-count="search.showListings.length"
        @reset-filters="resetFilters"
        :loading="search.showLoading"
        :error="search.showError"
        loading-text="Recherche des spectacles…"
        empty-text="Aucun spectacle trouvé près de vous."
      />
      <ListingList
        v-if="hasConcert"
        searchable
        :activity="activityLabel('concert')"
        title="🎵 Concerts près de vous"
        favorite-category="concert"
        :items="concerts"
        :filtered="distanceFiltered"
        :total-count="search.concertListings.length"
        @reset-filters="resetFilters"
        :loading="search.concertLoading"
        :error="search.concertError"
        loading-text="Recherche des concerts…"
        empty-text="Aucun concert trouvé près de vous."
      />
      <ListingList
        v-if="hasSport"
        :activity="activityLabel('sport')"
        title="🏃 Sport près de vous"
        favorite-category="sport"
        :items="sports"
        :filtered="distanceFiltered"
        :total-count="search.sportListings.length"
        @reset-filters="resetFilters"
        :loading="search.sportLoading"
        :error="search.sportError"
        loading-text="Recherche des équipements sportifs…"
        empty-text="Aucun équipement sportif trouvé près de vous."
      />
      <ListingList
        v-if="hasMuseum"
        :activity="activityLabel('museum')"
        title="🏛️ Musées près de vous"
        favorite-category="museum"
        :items="museums"
        :filtered="venueFiltered"
        :total-count="search.museumListings.length"
        @reset-filters="resetFilters"
        :loading="search.museumLoading"
        :error="search.museumError"
        loading-text="Recherche des musées…"
        empty-text="Aucun musée trouvé près de vous."
      />
    </div>
    <section v-else class="flex max-w-lg flex-col items-center gap-4">
      <h1 class="text-2xl font-bold sm:text-3xl">Trouvons ta prochaine sortie</h1>
      <p class="text-white/70">Choisis un lieu et une heure pour découvrir des restaurants, des bars ou des séances de cinéma près de toi.</p>
      <RouterLink to="/" class="rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-6 py-3 font-bold">
        Trouver une sortie
      </RouterLink>
    </section>

    <RouterLink to="/" class="underline">← Retour</RouterLink>
    <ShortlistBar />
  </main>
</template>
