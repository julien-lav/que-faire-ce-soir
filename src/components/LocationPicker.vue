<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { searchPlaces, type Place } from '../services/geocoding'
import { useSearchStore } from '../stores/search'

const MIN_CHARS = 3
const DEBOUNCE_MS = 300

const search = useSearchStore()
const editing = ref(false)
const query = ref('')
const suggestions = ref<Place[]>([])
const active = ref(-1)
const searching = ref(false)
const failed = ref(false)
const input = ref<HTMLInputElement | null>(null)

let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | null = null

function cancelPending() {
  clearTimeout(timer)
  controller?.abort()
  controller = null
}

async function edit() {
  query.value = ''
  editing.value = true
  // `autofocus` is ignored on elements added after page load
  await nextTick()
  input.value?.focus()
}

// The browser could not locate the user: an address is required to go on
const needsAddress = computed(() => search.locationStatus === 'needs-address' && !search.place)
const needsAddressHint = computed(() =>
  search.locationError === 'denied'
    ? 'Localisation refusée. Entrez une adresse, ou autorisez-la dans votre navigateur.'
    : 'Impossible de vous localiser. Entrez une adresse pour continuer.',
)

watch(
  needsAddress,
  (needed) => {
    if (needed && !editing.value) void edit()
  },
  { immediate: true },
)

function close() {
  cancelPending()
  searching.value = false
  suggestions.value = []
  editing.value = false
}

function pick(place: Place | null) {
  search.setPlace(place)
  close()
}

// Search as the user types, once there is enough text and they paused for a moment
watch(query, (text) => {
  cancelPending()
  active.value = -1
  failed.value = false

  const q = text.trim()
  if (q.length < MIN_CHARS) {
    suggestions.value = []
    searching.value = false
    return
  }

  searching.value = true
  timer = setTimeout(async () => {
    const mine = new AbortController()
    controller = mine
    try {
      suggestions.value = await searchPlaces(q, mine.signal)
    } catch {
      // An aborted request is just an outdated one: only a real failure is reported
      if (!mine.signal.aborted) {
        failed.value = true
        suggestions.value = []
      }
    } finally {
      if (controller === mine) searching.value = false
    }
  }, DEBOUNCE_MS)
})

function move(step: number) {
  if (!suggestions.value.length) return
  active.value = (active.value + step + suggestions.value.length) % suggestions.value.length
}

function confirm() {
  const place = suggestions.value[active.value] ?? suggestions.value[0]
  if (place) pick(place)
}

onBeforeUnmount(cancelPending)
</script>

<template>
  <div class="flex w-full max-w-sm flex-col items-center gap-2">
    <template v-if="!editing">
      <p v-if="search.locationStatus === 'locating'" role="status" class="text-xl text-white/70">
        📍 Recherche de votre position…
      </p>
      <p v-else class="text-xl">📍 {{ search.location }}</p>
      <button
        type="button"
        class="rounded-lg border border-white/20 px-4 py-1 text-sm hover:bg-white/10"
        @click="edit"
      >
        Changer de lieu
      </button>
    </template>

    <template v-else>
      <input
        ref="input"
        v-model="query"
        type="search"
        autocomplete="off"
        placeholder="Ville ou adresse"
        aria-label="Lieu"
        role="combobox"
        :aria-expanded="suggestions.length > 0"
        class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-white outline-none placeholder:text-white/40 focus:border-fuchsia-500"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="confirm"
        @keydown.esc="close"
      />

      <ul
        v-if="suggestions.length"
        role="listbox"
        class="w-full overflow-hidden rounded-lg border border-white/20 bg-slate-900 text-left"
      >
        <li v-for="(s, i) in suggestions" :key="`${s.label}-${s.lat}-${s.lng}`" role="option" :aria-selected="i === active">
          <button
            type="button"
            class="block w-full px-3 py-2 hover:bg-white/10"
            :class="{ 'bg-white/10': i === active }"
            @click="pick(s)"
          >
            {{ s.label }}
            <span v-if="s.context" class="block text-xs text-white/50">{{ s.context }}</span>
          </button>
        </li>
      </ul>

      <p v-else-if="searching" role="status" class="text-sm text-white/60">Recherche…</p>
      <p v-else-if="failed" class="text-sm text-red-400">Recherche indisponible, réessayez.</p>
      <p v-else-if="query.trim().length >= MIN_CHARS" class="text-sm text-white/60">
        Aucun lieu trouvé.
      </p>
      <p v-else-if="needsAddress" role="alert" class="text-sm text-amber-300">{{ needsAddressHint }}</p>
      <p v-else class="text-sm text-white/40">Tapez au moins {{ MIN_CHARS }} lettres.</p>

      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-white/20 px-4 py-1 text-sm hover:bg-white/10"
          @click="pick(null)"
        >
          {{ needsAddress ? '📍 Réessayer' : '📍 Autour de moi' }}
        </button>
        <button
          v-if="!needsAddress"
          type="button"
          class="rounded-lg px-4 py-1 text-sm text-white/60 hover:bg-white/10"
          @click="close"
        >
          Annuler
        </button>
      </div>
    </template>
  </div>
</template>
