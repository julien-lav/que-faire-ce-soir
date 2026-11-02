<script setup lang="ts">
import { computed } from 'vue'
import { defaultListingFilters, hasActiveFilters, type ListingFilters } from '../services/listingFilters'

const filters = defineModel<ListingFilters>({ required: true })
const props = defineProps<{
  foodServices: boolean
  openingHours: boolean
  hour: number | null
}>()

const distances = [0.5, 1, 1.5, 2, 3, 5, 10]
const services = [
  { value: 'all', label: 'Tous' },
  { value: 'dineIn', label: 'Sur place' },
  { value: 'takeaway', label: 'À emporter' },
  { value: 'delivery', label: 'Livraison' },
] as const

const active = computed(() => hasActiveFilters(filters.value, {
  foodServices: props.foodServices,
  openingHours: props.openingHours && props.hour !== null,
}))

const hourLabel = computed(() => props.hour === null ? "l'heure choisie" : `${String(props.hour).padStart(2, '0')}h`)
</script>

<template>
  <section
    aria-labelledby="listing-filters-title"
    class="w-full max-w-md rounded-2xl border border-white/20 bg-white/5 p-4 text-left md:max-w-3xl"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="listing-filters-title" class="font-bold">Affiner les résultats</h2>
      <button
        type="button"
        :disabled="!active"
        class="rounded-full px-3 py-1 text-sm text-fuchsia-200 underline underline-offset-4 transition hover:bg-white/10 disabled:cursor-default disabled:text-white/30 disabled:no-underline"
        @click="filters = defaultListingFilters()"
      >
        Réinitialiser les filtres
      </button>
    </div>

    <div class="mt-4 flex flex-wrap items-start gap-x-8 gap-y-4">
      <label class="flex w-full flex-col gap-2 text-sm sm:w-auto">
        <span class="font-medium">Distance maximale</span>
        <select
          v-model="filters.maxDistanceKm"
          aria-describedby="distance-filter-help"
          class="w-full rounded-xl border border-white/25 bg-slate-900 px-3 py-2.5 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400 sm:min-w-52"
        >
          <option :value="null">Toute la zone de recherche</option>
          <option v-for="distance in distances" :key="distance" :value="distance">
            {{ distance < 1 ? `${distance * 1000} m` : `${distance.toLocaleString('fr-FR')} km` }}
          </option>
        </select>
        <span id="distance-filter-help" class="text-xs text-white/50">Dans la zone déjà recherchée pour chaque activité.</span>
      </label>

      <div v-if="openingHours" class="flex-1 text-sm sm:pt-8">
        <label class="flex items-center gap-2" :class="hour === null ? 'text-white/40' : 'cursor-pointer'">
          <input
            v-model="filters.openOnly"
            type="checkbox"
            :disabled="hour === null"
            aria-describedby="opening-filter-help"
            class="size-4 shrink-0 accent-fuchsia-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400"
          />
          Ouverts à {{ hourLabel }}
        </label>
        <p id="opening-filter-help" class="mt-2 text-xs text-white/50">
          <template v-if="hour === null">Choisis une heure sur l'accueil pour activer ce filtre.</template>
          <template v-else>Pizzerias, restaurants, bars et musées : horaires confirmés uniquement.</template>
        </p>
      </div>
    </div>

    <fieldset v-if="foodServices" class="mt-4 border-t border-white/10 pt-3" aria-describedby="service-filter-help">
      <legend class="px-1 text-sm font-medium">Service · pizzerias et restaurants</legend>
      <div class="flex flex-wrap gap-2">
        <label v-for="service in services" :key="service.value" class="cursor-pointer">
          <input v-model="filters.service" type="radio" name="food-service" :value="service.value" class="peer sr-only" />
          <span
            class="block rounded-full border px-3 py-2 text-sm transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fuchsia-400"
            :class="filters.service === service.value
              ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100'
              : 'border-white/20 text-white/70 hover:bg-white/10'"
          >{{ service.label }}</span>
        </label>
      </div>
      <p id="service-filter-help" class="mt-2 text-xs text-white/50">Selon les informations disponibles pour chaque établissement.</p>
    </fieldset>
  </section>
</template>
