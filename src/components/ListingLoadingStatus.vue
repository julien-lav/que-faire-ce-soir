<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{
  label: string
  hasResults: boolean
  slowSource?: boolean
}>()

// This component only exists while loading; each new search starts with fresh timers.
const waitStage = ref(0)
const timers = props.slowSource
  ? [setTimeout(() => { waitStage.value = 1 }, 5000), setTimeout(() => { waitStage.value = 2 }, 12_000)]
  : []
onBeforeUnmount(() => timers.forEach(clearTimeout))

const message = computed(() => {
  if (props.hasResults) return 'Recherche complémentaire…'
  if (!props.slowSource || waitStage.value === 0) return props.label
  return waitStage.value === 1
    ? 'La recherche prend un peu de temps…'
    : 'Toujours à la recherche d’adresses…'
})

const hint = computed(() => {
  if (props.hasResults) return 'Tu peux déjà consulter ces adresses pendant que la liste se complète.'
  if (waitStage.value === 0) return 'Les premières adresses s’afficheront ici dès qu’elles arrivent.'
  return waitStage.value === 1
    ? 'Merci de patienter, nous recherchons les adresses autour de toi.'
    : 'Les résultats s’affichent automatiquement, sans recharger la page.'
})
</script>

<template>
  <div
    role="status"
    aria-atomic="true"
    class="flex items-start gap-3 text-white/70"
    :class="slowSource ? 'mb-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm' : { 'mb-3 text-sm': hasResults }"
  >
    <span
      class="mt-0.5 size-5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-fuchsia-400 motion-reduce:animate-none"
      aria-hidden="true"
    ></span>
    <div class="min-w-0">
      <p>{{ message }}</p>
      <p v-if="slowSource" class="mt-1 text-xs leading-relaxed text-white/50">{{ hint }}</p>
    </div>
  </div>
</template>
