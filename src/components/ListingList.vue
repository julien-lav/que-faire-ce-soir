<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ListingDetail from './ListingDetail.vue'
import { useIsMobile } from '../composables/useIsMobile'
import type { ListingItem } from '../services/listing'

const MAX_PLACES = 3
const MAX_ITEMS_MOBILE = 10
const MAX_TAGS = 3

const props = defineProps<{
  title: string
  items: ListingItem[]
  loading: boolean
  error: string | null
  loadingText: string
  emptyText: string
}>()

const expanded = reactive(new Set<string>())
const isMobile = useIsMobile()
const showAll = ref(false)
const selected = ref<ListingItem | null>(null)

// On desktop every item is shown; on mobile the list is cut after the first 10
const visibleItems = computed(() =>
  isMobile.value && !showAll.value ? props.items.slice(0, MAX_ITEMS_MOBILE) : props.items,
)
const hiddenCount = computed(() => props.items.length - MAX_ITEMS_MOBILE)

const visiblePlaces = (item: ListingItem) =>
  expanded.has(item.id) ? item.places : item.places.slice(0, MAX_PLACES)

function toggle(id: string) {
  if (expanded.has(id)) expanded.delete(id)
  else expanded.add(id)
}

const formatDistance = (km: number) => `${km.toFixed(1)} km`
</script>

<template>
  <section class="w-full text-left">
    <h2 class="mb-4 text-xl font-bold">{{ title }}</h2>

    <!-- Results already received stay visible while the rest (e.g. opening hours) still loads -->
    <p
      v-if="loading"
      role="status"
      class="flex items-center gap-3 text-white/70"
      :class="{ 'mb-3 text-sm': items.length }"
    >
      <span
        class="size-5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-fuchsia-500"
        aria-hidden="true"
      ></span>
      {{ items.length ? 'Mise à jour…' : loadingText }}
    </p>
    <p v-else-if="error" class="text-red-400">{{ error }}</p>
    <p v-else-if="!items.length" class="text-white/70">{{ emptyText }}</p>

    <ul v-if="items.length" class="flex flex-col gap-3">
      <li
        v-for="item in visibleItems"
        :key="item.id"
        role="button"
        tabindex="0"
        class="cursor-pointer rounded-xl border p-4 transition hover:bg-white/10"
        :class="
          item.favorite
            ? 'border-amber-400/70 bg-amber-400/10 hover:border-amber-400'
            : 'border-white/20 bg-white/5 hover:border-fuchsia-500/60'
        "
        @click="selected = item"
        @keydown.enter.self="selected = item"
      >
        <h3 class="flex items-center justify-between gap-2 font-semibold">
          <!-- Long names without spaces (e.g. "Karaté/Kobudo/Ninjutsu/...") are cut after 2 lines -->
          <span class="line-clamp-2 min-w-0 break-words" :title="item.title">
            <span v-if="item.favorite" class="text-amber-400" role="img" aria-label="Favori">★</span>
            {{ item.title }}
          </span>
          <span class="shrink-0 text-white/40" aria-hidden="true">›</span>
        </h3>
        <ul v-if="item.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
          <li
            v-for="t in item.tags.slice(0, MAX_TAGS)"
            :key="t"
            class="rounded-full bg-fuchsia-500/20 px-2.5 py-0.5 text-xs text-fuchsia-200"
          >
            {{ t }}
          </li>
        </ul>
        <div v-for="p in visiblePlaces(item)" :key="p.id" class="mt-2 text-sm">
          <p class="text-white/80">
            📍 {{ p.name }}
            <template v-if="p.distanceKm !== undefined">
              — {{ formatDistance(p.distanceKm) }}
            </template>
          </p>
          <p v-if="p.times.length" class="text-white/60">
            🕐 {{ p.times.join(' · ') }}
          </p>
          <p
            v-if="p.status"
            class="text-xs font-semibold"
            :class="p.status.open ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ p.status.open ? '✅' : '⛔' }} {{ p.status.label }}
          </p>
          <p v-else-if="p.detail" class="text-white/60">{{ p.detailIcon ?? '🏟️' }} {{ p.detail }}</p>
        </div>
        <button
          v-if="item.places.length > MAX_PLACES"
          type="button"
          class="mt-3 text-sm text-fuchsia-400 underline"
          @click.stop="toggle(item.id)"
        >
          {{
            expanded.has(item.id) ? 'Voir moins' : `Voir plus (${item.places.length - MAX_PLACES})`
          }}
        </button>
      </li>
    </ul>

    <button
      v-if="isMobile && hiddenCount > 0"
      type="button"
      class="mt-4 w-full rounded-full border-2 border-white/30 py-3 font-bold transition hover:bg-white/10"
      @click="showAll = !showAll"
    >
      {{ showAll ? 'Voir moins' : `Voir plus (${hiddenCount})` }}
    </button>

    <ListingDetail v-if="selected" :item="selected" @close="selected = null" />
  </section>
</template>
