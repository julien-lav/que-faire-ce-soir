<script setup lang="ts">
import { computed } from 'vue'
import type { ListingItem, ListingPlace } from '../services/listing'
import { favoriteTitle, type FavoriteCategory } from '../services/personalFavorites'
import { useFavoritesStore } from '../stores/favorites'

const props = defineProps<{ category: FavoriteCategory; item: ListingItem; place?: ListingPlace }>()
const emit = defineEmits<{ choosePlace: [] }>()
const favorites = useFavoritesStore()
const saved = computed(() => props.place
  ? favorites.has(props.category, props.place)
  : props.item.places.some((place) => favorites.has(props.category, place)))
const name = computed(() => props.place ? favoriteTitle(props.category, props.item, props.place) : props.item.title)
const label = computed(() => props.place
  ? `${saved.value ? 'Retirer' : 'Ajouter'} ${name.value} ${saved.value ? 'des' : 'aux'} favoris`
  : `Choisir un lieu favori pour ${name.value}`)

function toggle() {
  if (props.place) favorites.toggle(props.category, props.item, props.place)
  else emit('choosePlace')
}
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    :aria-pressed="place ? saved : undefined"
    :aria-haspopup="place ? undefined : 'dialog'"
    class="flex size-9 shrink-0 items-center justify-center rounded-full border transition hover:bg-rose-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
    :class="saved ? 'border-rose-400/60 bg-rose-500/15 text-rose-400' : 'border-white/25 text-white/60 hover:text-rose-300'"
    @click.stop="toggle"
    @keydown.stop
  >
    <svg viewBox="0 0 24 24" class="size-5" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  </button>
</template>
