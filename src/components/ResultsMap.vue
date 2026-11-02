<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ListingDetail from './ListingDetail.vue'
import type { ListingItem } from '../services/listing'
import { isFavoriteCategory, type FavoriteCategory } from '../services/personalFavorites'
import { buildMapPlaces, hasMapPosition, type MapGroup, type MapPoint } from '../services/mapPlaces'

const props = defineProps<{
  groups: MapGroup[]
  center: { lat: number; lng: number } | null
}>()

const container = ref<HTMLDivElement | null>(null)
const selected = ref<ListingItem | null>(null)
const selectedCategory = ref<FavoriteCategory | undefined>()
const tileError = ref(false)
const locations = computed(() => buildMapPlaces(props.groups))
const points = computed(() => locations.value.points)
const missing = computed(() => locations.value.missing)
const loading = computed(() => props.groups.some((group) => group.loading))
const legend = computed(() => props.groups.filter((group) => group.items.some((item) => item.places.some(hasMapPosition))))
const canShowMap = computed(() => points.value.length > 0 || hasMapPosition(props.center))

let map: L.Map | undefined
let markers: L.LayerGroup | undefined
let tiles: L.TileLayer | undefined
let resizeObserver: ResizeObserver | undefined

function recenter() {
  if (!map) return
  const bounds = L.latLngBounds(points.value.map((point) => L.latLng(point.lat, point.lng)))
  if (hasMapPosition(props.center)) bounds.extend([props.center.lat, props.center.lng])
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15, animate: false })
}

function popupFor(point: MapPoint): HTMLElement {
  const root = document.createElement('div')
  root.className = 'map-results-popup'
  for (const entry of point.entries) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'map-result-button'
    const title = document.createElement('strong')
    title.textContent = `${entry.activity.split(' ')[0]} ${entry.item.title}`
    const detail = document.createElement('span')
    detail.textContent = [entry.place.name, entry.place.address, entry.place.times.join(' · ')].filter(Boolean).join(' · ')
    button.append(title, detail)
    button.addEventListener('click', () => {
      selectedCategory.value = isFavoriteCategory(entry.category) ? entry.category : undefined
      selected.value = { ...entry.item, places: [entry.place] }
    })
    root.append(button)
  }
  return root
}

function renderMarkers() {
  if (!container.value || !canShowMap.value) return
  if (!map) {
    map = L.map(container.value, { scrollWheelZoom: false, zoomControl: false })
    L.control.zoom({ position: 'topright', zoomInTitle: 'Zoomer', zoomOutTitle: 'Dézoomer' }).addTo(map)
    tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">contributeurs OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    tiles.on('tileerror', () => { tileError.value = true })
    markers = L.layerGroup().addTo(map)
    resizeObserver = new ResizeObserver(() => { map?.invalidateSize({ pan: false }) })
    resizeObserver.observe(container.value)
  }

  markers!.clearLayers()
  if (hasMapPosition(props.center)) {
    L.circleMarker([props.center.lat, props.center.lng], {
      radius: 7, color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1,
    }).bindTooltip('Point de recherche').addTo(markers!)
  }
  for (const point of points.value) {
    const labels = [...new Set(point.entries.map((entry) => entry.activity))]
    const badge = document.createElement('span')
    badge.textContent = labels.length === 1 ? labels[0]!.split(' ')[0]! : '📍'
    const title = point.entries.map((entry) => entry.item.title).join(' · ')
    L.marker([point.lat, point.lng], {
      icon: L.divIcon({ html: badge, className: 'result-map-marker', iconSize: [36, 36], iconAnchor: [18, 36] }),
      title,
      alt: title,
      keyboard: true,
      riseOnHover: true,
    }).bindPopup(() => popupFor(point), { maxHeight: 240, maxWidth: 300 })
      .addTo(markers!)
  }
  map.invalidateSize({ pan: false })
  recenter()
}

function retryTiles() {
  tileError.value = false
  tiles?.redraw()
}

onMounted(renderMarkers)
watch([points, () => props.center], () => {
  selected.value = null
  renderMarkers()
}, { flush: 'post' })
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
  map = undefined
})
</script>

<template>
  <section aria-labelledby="map-results-title" class="w-full max-w-6xl rounded-2xl border border-white/20 bg-white/5 p-3 text-left sm:p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 id="map-results-title" class="font-bold">Les sorties sur la carte</h2>
      <button
        v-if="canShowMap"
        type="button"
        class="rounded-full border border-white/25 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400"
        @click="recenter"
      >Recentrer</button>
    </div>
    <p role="status" class="mb-3 text-sm text-white/60">
      <template v-if="points.length">{{ points.length }} lieu{{ points.length > 1 ? 'x' : '' }} · Clique sur un repère pour voir les sorties.</template>
      <template v-else-if="loading">Les lieux apparaîtront au fil de la recherche…</template>
      <template v-else>Aucun lieu à afficher avec les résultats actuels.</template>
    </p>
    <div
      v-show="canShowMap"
      ref="container"
      role="region"
      aria-label="Carte interactive des résultats"
      class="results-map relative isolate z-0 h-[360px] w-full overflow-hidden rounded-xl bg-slate-800 sm:h-[440px]"
    ></div>
    <p v-if="tileError" role="status" class="mt-2 text-sm text-amber-200">
      Le fond de carte est indisponible pour le moment.
      <button type="button" class="ml-1 underline underline-offset-2" @click="retryTiles">Réessayer</button>
    </p>
    <ul v-if="points.length" aria-label="Légende de la carte" class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
      <li v-if="hasMapPosition(center)"><span class="mr-1 inline-block size-2 rounded-full bg-blue-500" aria-hidden="true"></span>Point de recherche</li>
      <li v-for="group in legend" :key="group.id">{{ group.label }}</li>
    </ul>
    <p v-if="missing" class="mt-2 text-xs text-white/50">{{ missing }} lieu{{ missing > 1 ? 'x' : '' }} sans position disponible {{ missing > 1 ? 'restent accessibles' : 'reste accessible' }} dans les listes.</p>
    <ListingDetail v-if="selected" :item="selected" :favorite-category="selectedCategory" @close="selected = null" />
  </section>
</template>

<style scoped>
.results-map :deep(.result-map-marker) {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  border-radius: 50% 50% 50% 0;
  background: #a21caf;
  box-shadow: 0 3px 10px #0005;
  transform-origin: bottom center;
}
.results-map :deep(.result-map-marker span) { font-size: 21px; line-height: 1; }
.results-map :deep(.leaflet-popup-content) { margin: 10px; }
.results-map :deep(.map-results-popup) { display: grid; gap: 6px; }
.results-map :deep(.map-result-button) {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  color: #0f172a;
  text-align: left;
  cursor: pointer;
}
.results-map :deep(.map-result-button:hover),
.results-map :deep(.map-result-button:focus-visible) { background: #fae8ff; outline: 2px solid #c026d3; }
.results-map :deep(.map-result-button span) { font-size: 12px; color: #475569; }
.results-map :deep(.leaflet-control-attribution) { font-size: 10px; }
</style>
