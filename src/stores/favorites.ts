import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref } from 'vue'
import type { ListingItem, ListingPlace } from '../services/listing'
import {
  createPersonalFavorite, favoriteKey, FAVORITES_STORAGE_KEY, parsePersonalFavorites,
  serializePersonalFavorites, type FavoriteCategory, type PersonalFavorite,
} from '../services/personalFavorites'

export const useFavoritesStore = defineStore('personalFavorites', () => {
  function read(): PersonalFavorite[] {
    try {
      return typeof window === 'undefined' ? [] : parsePersonalFavorites(window.localStorage.getItem(FAVORITES_STORAGE_KEY))
    } catch {
      return []
    }
  }

  const favorites = ref(read())
  const storageError = ref(false)
  const count = computed(() => favorites.value.length)
  const has = (category: FavoriteCategory, place: ListingPlace) =>
    favorites.value.some((entry) => entry.key === favoriteKey(category, place.id))

  function persist() {
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, serializePersonalFavorites(favorites.value))
      storageError.value = false
    } catch {
      storageError.value = true
    }
  }

  function toggle(category: FavoriteCategory, item: ListingItem, place: ListingPlace) {
    const key = favoriteKey(category, place.id)
    if (has(category, place)) favorites.value = favorites.value.filter((entry) => entry.key !== key)
    else favorites.value = [createPersonalFavorite(category, item, place), ...favorites.value]
    persist()
  }

  // Keep hearts consistent between tabs without writing the same event back.
  function onStorage(event: StorageEvent) {
    if (event.key !== FAVORITES_STORAGE_KEY && event.key !== null) return
    if (event.storageArea && event.storageArea !== window.localStorage) return
    favorites.value = read()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
    onScopeDispose(() => window.removeEventListener('storage', onStorage))
  }

  return { favorites, count, has, toggle, storageError }
})
