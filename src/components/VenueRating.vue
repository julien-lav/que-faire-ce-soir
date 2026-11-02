<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ListingPlace } from '../services/listing'
import { fetchVenueRating, type VenueRating } from '../services/ratings'

const props = defineProps<{ name: string; place: ListingPlace }>()
const rating = ref<VenueRating | null>(null)
const formattedRating = computed(() => rating.value?.value.toLocaleString('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}))

watch(() => [props.name, props.place.id, props.place.lat, props.place.lng, props.place.reviewable],
  async (_, __, onCleanup) => {
    let active = true
    onCleanup(() => { active = false })
    rating.value = null
    const result = await fetchVenueRating(props.name, props.place)
    if (active) rating.value = result
  }, { immediate: true })
</script>

<template>
  <p v-if="rating" class="mt-1 text-sm text-amber-200">
    <span aria-hidden="true">⭐</span>
    <span :aria-label="`Note : ${formattedRating} sur 5`"> {{ formattedRating }}/5</span>
    <span class="text-white/60"> · {{ rating.count }} avis · </span>
    <a
      href="https://mangrove.reviews/"
      target="_blank"
      rel="noopener noreferrer"
      class="text-white/60 underline decoration-white/30 underline-offset-2 hover:text-white"
      title="Source : avis de la communauté Mangrove (CC BY 4.0)"
      @click.stop
      @keydown.stop
    >Mangrove</a>
  </p>
</template>
