<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import ListingDetail from './ListingDetail.vue'
import VenueRating from './VenueRating.vue'
import FavoriteButton from './FavoriteButton.vue'
import type { FavoriteCategory } from '../services/personalFavorites'
import { useIsMobile } from '../composables/useIsMobile'
import type { ListingItem } from '../services/listing'
import { useShortlistStore } from '../stores/shortlist'

const MAX_PLACES = 3
const MAX_ITEMS_MOBILE = 10
const MAX_TAGS = 3

const props = defineProps<{
  title: string
  // Name of the category in the copied message, e.g. "🎬 Ciné"
  activity: string
  items: ListingItem[]
  loading: boolean
  error: string | null
  loadingText: string
  emptyText: string
  filtered?: boolean
  totalCount?: number
  favoriteCategory?: FavoriteCategory
  searchable?: boolean
  // Show only this many items first, on every screen size (default: all on desktop, 10 on mobile)
  limit?: number
}>()
const emit = defineEmits<{ resetFilters: [] }>()

const shortlist = useShortlistStore()
const expanded = reactive(new Set<string>())
const isMobile = useIsMobile()
// How many more items "Charger plus" has revealed so far
const loadedMore = ref(0)
const selected = ref<ListingItem | null>(null)
const searchOpen = ref(false)
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const searchToggle = ref<HTMLButtonElement | null>(null)
const searchId = useId()
const normalizeTitle = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr').trim()
const normalizedQuery = computed(() => props.searchable ? normalizeTitle(query.value) : '')
const matchingItems = computed(() => normalizedQuery.value
  ? props.items.filter((item) => normalizeTitle(item.title).includes(normalizedQuery.value))
  : props.items)

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) query.value = ''
  await nextTick()
  if (searchOpen.value) searchInput.value?.focus()
  else searchToggle.value?.focus()
}

// A new filtered set starts at page one, including when more results arrive.
watch([() => props.items, normalizedQuery], () => {
  loadedMore.value = 0
  expanded.clear()
  if (selected.value) selected.value = props.items.find((item) => item.id === selected.value?.id) ?? null
})

// Without `limit`, every item is shown on desktop and the list is cut after the first 10 on mobile
const pageSize = computed(() => props.limit ?? (isMobile.value ? MAX_ITEMS_MOBILE : Infinity))
const visibleCount = computed(() => pageSize.value + loadedMore.value)
const visibleItems = computed(() => matchingItems.value.slice(0, visibleCount.value))
const hiddenCount = computed(() => Math.max(0, matchingItems.value.length - visibleCount.value))

const visiblePlaces = (item: ListingItem) =>
  expanded.has(item.id) ? item.places : item.places.slice(0, MAX_PLACES)

function toggle(id: string) {
  if (expanded.has(id)) expanded.delete(id)
  else expanded.add(id)
}

const formatDistance = (km: number) => `${km.toFixed(1)} km`
</script>

<template>
  <section class="min-w-0 w-full text-left">
    <div class="mb-4 flex items-center justify-between gap-2">
      <h2 class="min-w-0 text-xl font-bold">{{ title }}</h2>
      <button
        v-if="searchable"
        ref="searchToggle"
        type="button"
        :aria-label="`${searchOpen ? 'Fermer la recherche' : 'Rechercher un titre'} dans ${title}`"
        :title="searchOpen ? 'Fermer la recherche' : 'Rechercher un titre'"
        :aria-expanded="searchOpen"
        :aria-controls="searchId"
        class="flex size-11 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400"
        :class="{ 'bg-fuchsia-500/15 text-fuchsia-300': searchOpen }"
        @click="toggleSearch"
      >
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      </button>
    </div>
    <input
      v-if="searchable && searchOpen"
      :id="searchId"
      ref="searchInput"
      v-model="query"
      type="search"
      :aria-label="`Titre à rechercher dans ${title}`"
      placeholder="Rechercher un titre…"
      autocomplete="off"
      class="mb-3 min-w-0 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-base text-white outline-none placeholder:text-white/40 focus:border-fuchsia-400"
      @keydown.esc.prevent="toggleSearch"
    />
    <p v-if="normalizedQuery" role="status" class="mb-3 text-sm text-white/60">
      {{ matchingItems.length }} titre{{ matchingItems.length > 1 ? 's' : '' }} correspondant{{ matchingItems.length > 1 ? 's' : '' }}
      <span v-if="!matchingItems.length"> — essaie un autre titre.</span>
    </p>
    <p v-if="filtered && totalCount" role="status" class="-mt-2 mb-3 text-sm text-white/60">
      {{ items.length }} résultat{{ items.length > 1 ? 's' : '' }} sur {{ totalCount }}
    </p>

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
      {{ items.length ? 'Recherche complémentaire…' : loadingText }}
    </p>
    <p v-else-if="error" role="status" :class="items.length ? 'text-sm text-amber-200' : 'text-red-400'">{{ error }}</p>
    <div v-else-if="!items.length && filtered && totalCount" class="text-white/70">
      <p>Aucun résultat ne correspond à tes filtres.</p>
      <button
        type="button"
        class="mt-3 rounded-full border border-fuchsia-400/50 px-4 py-2 text-sm text-fuchsia-200 transition hover:bg-fuchsia-500/10"
        @click="emit('resetFilters')"
      >
        Réinitialiser les filtres
      </button>
    </div>
    <p v-else-if="!items.length" class="text-white/70">{{ emptyText }}</p>

    <ul v-if="matchingItems.length" class="flex flex-col gap-3">
      <li
        v-for="item in visibleItems"
        :key="item.id"
        role="button"
        tabindex="0"
        class="relative cursor-pointer rounded-xl border p-4 pb-16 transition hover:bg-white/10"
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
            <span v-if="item.favorite" class="text-amber-400" role="img" aria-label="Adresse recommandée">★</span>
            {{ item.title }}
          </span>
          <span class="shrink-0 text-white/40" aria-hidden="true">›</span>
        </h3>
        <ul v-if="item.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
          <li
            v-for="t in item.tags.slice(0, MAX_TAGS)"
            :key="t"
            :title="t"
            class="max-w-full truncate rounded-full bg-fuchsia-500/20 px-2.5 py-0.5 text-xs text-fuchsia-200"
          >
            {{ t }}
          </li>
        </ul>
        <div v-for="p in visiblePlaces(item)" :key="p.id" class="mt-2 text-sm">
          <VenueRating v-if="p.reviewable" :name="item.title" :place="p" />
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
        <div role="group" :aria-label="`Actions pour ${item.title}`" class="absolute right-3 bottom-3 flex items-center gap-2">
          <FavoriteButton
            v-if="favoriteCategory"
            :category="favoriteCategory"
            :item="item"
            :place="item.places.length === 1 ? item.places[0] : undefined"
            @choose-place="selected = item"
          />
          <button
            type="button"
            class="flex size-9 shrink-0 items-center justify-center rounded-full text-lg font-bold transition"
            :class="
              shortlist.has(activity, item)
                ? 'bg-fuchsia-500 text-white'
                : 'border border-white/30 bg-white/10 text-white/70 hover:bg-white/20'
            "
            :aria-pressed="shortlist.has(activity, item)"
            :aria-label="shortlist.has(activity, item) ? 'Retirer de ma sélection' : 'Ajouter à ma sélection'"
            :title="shortlist.has(activity, item) ? 'Retirer de ma sélection' : 'Ajouter à ma sélection'"
            @click.stop="shortlist.toggle(activity, item)"
            @keydown.enter.stop
          >
            {{ shortlist.has(activity, item) ? '✓' : '＋' }}
          </button>
        </div>
      </li>
    </ul>

    <button
      v-if="hiddenCount > 0"
      type="button"
      class="mt-4 w-full rounded-full border-2 border-white/30 py-3 font-bold transition hover:bg-white/10"
      @click="loadedMore += pageSize"
    >
      Charger plus ({{ hiddenCount }})
    </button>

    <ListingDetail v-if="selected" :item="selected" :favorite-category="favoriteCategory" @close="selected = null" />
  </section>
</template>
