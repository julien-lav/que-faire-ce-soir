<script setup lang="ts">
import { HOURS, useSearchStore } from '../stores/search'

const search = useSearchStore()
</script>

<template>
  <div class="flex flex-wrap justify-center gap-3">
    <button
      v-for="h in HOURS"
      :key="h"
      type="button"
      class="w-16 rounded-xl border px-3 py-2 text-lg font-medium transition"
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
</template>
