<script setup lang="ts">
import { computed } from 'vue'
import ListingList from '../components/ListingList.vue'
import ShortlistBar from '../components/ShortlistBar.vue'
import { useShortlistStore } from '../stores/shortlist'
import { useFavoritesStore } from '../stores/favorites'
import { activityLabel, useSearchStore } from '../stores/search'
import { FAVORITE_CATEGORIES } from '../services/personalFavorites'
import { haversineKm } from '../services/listing'
import { hasMapPosition } from '../services/mapPlaces'

const favorites = useFavoritesStore()
const search = useSearchStore()
const shortlist = useShortlistStore()
const groups = computed(() => FAVORITE_CATEGORIES.map((category) => ({
  ...category,
  items: favorites.favorites.filter((entry) => entry.category === category.id).map((entry) => ({
    ...entry.item,
    places: entry.item.places.map((place) => ({
      ...place,
      distanceKm: search.locationStatus === 'ok' && hasMapPosition(search.coords) && hasMapPosition(place)
        ? haversineKm(search.coords.lat, search.coords.lng, place.lat, place.lng)
        : undefined,
    })),
  })),
})).filter((group) => group.items.length > 0))
</script>

<template>
  <main :class="shortlist.count > 0 ? 'pb-44' : 'pb-8 sm:pb-10'" class="mx-auto page-shell flex w-full max-w-5xl flex-col items-center gap-6 px-4 pt-8 sm:px-6 sm:pt-10 text-center text-white">
    <h1 class="text-3xl font-bold">❤️ Mes favoris <span v-if="favorites.count" class="text-xl text-white/50">({{ favorites.count }})</span></h1>
    <p class="max-w-lg text-sm text-white/60">Tes adresses enregistrées sur ce navigateur, même hors de ta recherche actuelle. Vérifie leurs horaires avant de partir.</p>
    <div v-if="!favorites.count" class="w-full max-w-md rounded-2xl border border-white/20 bg-white/5 p-6">
      <p class="font-medium">Tes bonnes adresses t'attendent ici.</p>
      <p class="mt-2 text-sm text-white/60">Touche le cœur sur un lieu pour l'enregistrer et le retrouver lors de ta prochaine visite.</p>
    </div>
    <div v-else class="grid w-full grid-cols-1 items-start gap-8" :class="groups.length === 1 ? 'max-w-md' : 'md:grid-cols-2'">
      <ListingList
        v-for="group in groups"
        :key="group.id"
        :title="group.label"
        :activity="activityLabel(group.id)"
        :items="group.items"
        :favorite-category="group.id"
        :loading="false"
        :error="null"
        :limit="12"
        loading-text=""
        empty-text=""
      />
    </div>
    <RouterLink to="/" class="rounded-full border border-white/25 px-5 py-2 text-sm hover:bg-white/10">Chercher une sortie</RouterLink>
    <ShortlistBar />
  </main>
</template>
