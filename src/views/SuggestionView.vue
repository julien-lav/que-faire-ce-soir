<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ListingList from '../components/ListingList.vue'
import { useSearchStore } from '../stores/search'

const search = useSearchStore()

const hasCinema = computed(() => search.categories.includes('cinema'))
const hasShow = computed(() => search.categories.includes('show'))
const hasConcert = computed(() => search.categories.includes('concert'))
const hasSport = computed(() => search.categories.includes('sport'))
const listCount = computed(
  () => [hasCinema.value, hasShow.value, hasConcert.value, hasSport.value].filter(Boolean).length,
)

// One column per chosen list on desktop (full class names so Tailwind can see them); stacked on mobile
const GRID_CLASSES: Record<number, string> = {
  1: 'md:max-w-md md:grid-cols-1',
  2: 'md:max-w-3xl md:grid-cols-2',
  3: 'md:max-w-6xl md:grid-cols-3',
  4: 'md:max-w-7xl md:grid-cols-2 lg:grid-cols-4',
}

onMounted(() => {
  if (hasCinema.value) search.loadCinema()
  if (hasShow.value) search.loadShows()
  if (hasConcert.value) search.loadConcerts()
  if (hasSport.value) search.loadSport()
})
</script>

<template>
  <main
    class="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 py-10 text-center text-white"
  >
    <p class="text-white/70">
      {{ search.location }} · {{ search.hour !== null ? search.formatHour(search.hour) : '' }}
    </p>

    <div
      v-if="listCount > 0"
      class="grid w-full max-w-md grid-cols-1 items-start gap-8"
      :class="GRID_CLASSES[listCount]"
    >
      <ListingList
        v-if="hasCinema"
        title="🎬 Cinéma près de vous"
        :items="search.cinemaListings"
        :loading="search.cinemaLoading"
        :error="search.cinemaError"
        loading-text="Recherche des séances…"
        empty-text="Aucune séance trouvée près de vous."
      />
      <ListingList
        v-if="hasShow"
        title="🎭 Spectacles près de vous"
        :items="search.showListings"
        :loading="search.showLoading"
        :error="search.showError"
        loading-text="Recherche des spectacles…"
        empty-text="Aucun spectacle trouvé près de vous."
      />
      <ListingList
        v-if="hasConcert"
        title="🎵 Concerts près de vous"
        :items="search.concertListings"
        :loading="search.concertLoading"
        :error="search.concertError"
        loading-text="Recherche des concerts…"
        empty-text="Aucun concert trouvé près de vous."
      />
      <ListingList
        v-if="hasSport"
        title="🏃 Sport près de vous"
        :items="search.sportListings"
        :loading="search.sportLoading"
        :error="search.sportError"
        loading-text="Recherche des équipements sportifs…"
        empty-text="Aucun équipement sportif trouvé près de vous."
      />
    </div>
    <h1 v-else class="text-3xl font-bold">Ta sortie arrive bientôt…</h1>

    <RouterLink to="/" class="underline">← Retour</RouterLink>
  </main>
</template>
