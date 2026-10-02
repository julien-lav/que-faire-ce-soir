<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { ListingItem, ListingPlace } from '../services/listing'

defineProps<{ item: ListingItem }>()
const emit = defineEmits<{ close: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

// Keep the page behind from scrolling while the panel is open
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

const formatDistance = (km: number) => `${km.toFixed(1)} km`

function directionsUrl(p: ListingPlace) {
  const destination =
    p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : [p.name, p.address].filter(Boolean).join(' ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center md:p-6"
      @click.self="emit('close')"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="item.title"
        class="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-white/20 bg-slate-900 text-left text-white shadow-2xl md:max-w-lg md:rounded-3xl"
      >
        <img
          v-if="item.imageUrl"
          :src="item.imageUrl"
          :alt="item.title"
          loading="lazy"
          class="max-h-64 w-full object-cover"
        />

        <div class="flex flex-col gap-4 p-5">
          <div class="flex items-start justify-between gap-4">
            <h2 class="min-w-0 break-words text-2xl font-bold">{{ item.title }}</h2>
            <button
              type="button"
              aria-label="Fermer"
              class="rounded-full px-3 py-1 text-xl text-white/70 hover:bg-white/10"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <ul v-if="item.tags?.length" class="flex flex-wrap gap-2">
            <li
              v-for="t in item.tags"
              :key="t"
              class="rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs text-fuchsia-200"
            >
              {{ t }}
            </li>
          </ul>

          <p v-if="item.description" class="text-sm text-white/80">{{ item.description }}</p>

          <div v-for="p in item.places" :key="p.id" class="rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
            <p class="font-semibold">
              📍 {{ p.name }}
              <template v-if="p.distanceKm !== undefined"> — {{ formatDistance(p.distanceKm) }}</template>
            </p>
            <p v-if="p.address" class="text-white/60">{{ p.address }}</p>
            <p v-if="p.times.length" class="mt-1 text-white/80">🕐 {{ p.times.join(' · ') }}</p>
            <p
              v-if="p.status"
              class="mt-1 text-xs font-semibold"
              :class="p.status.open ? 'text-emerald-400' : 'text-red-400'"
            >
              {{ p.status.open ? '✅' : '⛔' }} {{ p.status.label }}
            </p>
            <ul v-if="p.schedule?.length" class="mt-2 space-y-0.5 text-xs text-white/70">
              <li v-for="line in p.schedule" :key="line">{{ line }}</li>
              <li v-if="p.scheduleSource" class="pt-1 text-white/40">
                Horaires : © contributeurs {{ p.scheduleSource }}
              </li>
            </ul>
            <p v-else-if="p.detail" class="mt-1 text-white/80">{{ p.detailIcon ?? '🏟️' }} {{ p.detail }}</p>

            <div class="mt-3 flex flex-wrap gap-2">
              <a
                v-if="p.bookingUrl"
                :href="p.bookingUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-4 py-2 font-bold"
              >
                🎟️ Réserver
              </a>
              <a
                v-if="p.phone"
                :href="`tel:${p.phone.replace(/\s/g, '')}`"
                class="rounded-full border border-white/30 px-4 py-2 font-bold hover:bg-white/10"
              >
                📞 Appeler
              </a>
              <a
                v-if="p.websiteUrl"
                :href="p.websiteUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-full border border-white/30 px-4 py-2 font-bold hover:bg-white/10"
              >
                🌐 Site officiel
              </a>
              <a
                :href="directionsUrl(p)"
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-full border border-white/30 px-4 py-2 font-bold hover:bg-white/10"
              >
                🧭 Itinéraire
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
