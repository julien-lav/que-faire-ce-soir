import { defineStore } from 'pinia'
import { ref } from 'vue'

export const HOURS = [18, 19, 20, 21, 22, 23, 0] as const

export const CATEGORIES = [
  { id: 'eat', emoji: '🍝', label: 'Manger' },
  { id: 'cinema', emoji: '🎬', label: 'Ciné' },
  { id: 'show', emoji: '🎭', label: 'Spectacle' },
  { id: 'out', emoji: '🍸', label: 'Sortir' },
] as const

export const MORE_CATEGORIES = [
  { id: 'sport', emoji: '🏃', label: 'Sport' },
  { id: 'museum', emoji: '🏛️', label: 'Musée' },
  { id: 'concert', emoji: '🎵', label: 'Concert' },
] as const

export type CategoryId = ((typeof CATEGORIES)[number] | (typeof MORE_CATEGORIES)[number])['id']

export const useSearchStore = defineStore('search', () => {
  const location = ref('Paris 11e')
  const hour = ref<number | null>(null)
  const categories = ref<CategoryId[]>([])

  const formatHour = (h: number) => `${String(h).padStart(2, '0')}h`

  function toggleCategory(id: CategoryId) {
    const i = categories.value.indexOf(id)
    if (i === -1) categories.value.push(id)
    else categories.value.splice(i, 1)
  }

  return { location, hour, categories, formatHour, toggleCategory }
})
