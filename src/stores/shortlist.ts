import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ListingItem, ListingPlace } from '../services/listing'
import { useSearchStore } from './search'

interface Pick {
  key: string
  // e.g. "🎬 Ciné"
  activity: string
  item: ListingItem
}

const formatDistance = (km: number) => `${km.toFixed(1).replace('.', ',')} km`

function formatPlace(p: ListingPlace): string[] {
  const head = `📍 ${p.name}${p.distanceKm !== undefined ? ` (${formatDistance(p.distanceKm)})` : ''}`
  const lines = [head]
  if (p.address && p.address !== p.name) lines.push(`   ${p.address}`)
  if (p.times.length) lines.push(`   🕐 ${p.times.join(' · ')}`)
  else if (p.status) lines.push(`   ${p.status.open ? '✅' : '⛔'} ${p.status.label}`)
  else if (p.detail) lines.push(`   ${p.detailIcon ?? '🏟️'} ${p.detail}`)
  return lines
}

// Cards the user ticked, to be copied as one message for friends
export const useShortlistStore = defineStore('shortlist', () => {
  const search = useSearchStore()
  const picks = ref<Pick[]>([])

  const count = computed(() => picks.value.length)
  const keyOf = (activity: string, item: ListingItem) => `${activity}:${item.id}`
  const has = (activity: string, item: ListingItem) =>
    picks.value.some((p) => p.key === keyOf(activity, item))

  function toggle(activity: string, item: ListingItem) {
    const key = keyOf(activity, item)
    const i = picks.value.findIndex((p) => p.key === key)
    if (i === -1) picks.value.push({ key, activity, item })
    else picks.value.splice(i, 1)
  }

  function clear() {
    picks.value = []
  }

  // A kept card would describe another place or hour than the one now searched
  watch([() => search.place, () => search.hour], clear)

  function buildMessage(): string {
    const when = search.hour !== null ? `Ce soir à partir de ${search.formatHour(search.hour)}` : 'Ce soir'
    const blocks = picks.value.map(({ activity, item }) => [
      `${activity} — ${item.title}`,
      ...item.places.flatMap(formatPlace),
    ].join('\n'))
    return [`🌙 ${when} — ${search.location}`, ...blocks].join('\n\n')
  }

  // The Clipboard API needs a secure context; fall back to a hidden textarea elsewhere (e.g. LAN)
  async function copy(): Promise<boolean> {
    const text = buildMessage()
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try {
        return document.execCommand('copy')
      } finally {
        area.remove()
      }
    }
  }

  return { picks, count, has, toggle, clear, copy, buildMessage }
})
