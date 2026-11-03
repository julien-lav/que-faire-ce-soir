<script setup lang="ts">
import { computed, ref } from 'vue'
import { HOURS, useSearchStore } from '../stores/search'

const VISIBLE = 7
const FIRST_EVENING_HOUR = 18

const search = useSearchStore()

// Index in HOURS of the first hour shown: starts on the evening, arrows move through the day
const start = ref(HOURS.indexOf(FIRST_EVENING_HOUR))

const visibleHours = computed(() => HOURS.slice(start.value, start.value + VISIBLE))
const hasEarlier = computed(() => start.value > 0)
const hasLater = computed(() => start.value + VISIBLE < HOURS.length)

const earlier = () => (start.value = Math.max(0, start.value - VISIBLE))
const later = () => (start.value = Math.min(HOURS.length - VISIBLE, start.value + VISIBLE))

const arrowClass =
  'flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-2xl text-white transition hover:bg-white/10'
</script>

<template>
  <div class="grid w-full max-w-xl grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
    <!-- Arrows are hidden (not removed) when there is nothing further, so the hours do not jump -->
    <button
      type="button"
      aria-label="Heures précédentes"
      :class="[arrowClass, { invisible: !hasEarlier }]"
      :tabindex="hasEarlier ? 0 : -1"
      @click="earlier"
    >
      ‹
    </button>

    <div class="grid min-w-0 grid-cols-3 gap-2 min-[360px]:grid-cols-4 sm:grid-cols-7">
      <button
        v-for="h in visibleHours"
        :key="h"
        type="button"
        class="min-h-11 min-w-0 rounded-xl border px-1 py-2 text-base font-medium transition"
        :class="
          search.hour === h
            ? 'border-fuchsia-500 bg-fuchsia-500 text-white'
            : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
        "
        @click="search.hour = h"
      >
        {{ search.formatHour(h) }}
      </button>
    </div>

    <button
      type="button"
      aria-label="Heures suivantes"
      :class="[arrowClass, { invisible: !hasLater }]"
      :tabindex="hasLater ? 0 : -1"
      @click="later"
    >
      ›
    </button>
  </div>
</template>
