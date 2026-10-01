<script setup lang="ts">
import { useSearchStore } from '../stores/search'

const search = useSearchStore()
</script>

<template>
  <main
    class="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-white"
  >
    <p class="text-white/70">
      {{ search.location }} · {{ search.hour !== null ? search.formatHour(search.hour) : '' }}
    </p>
    <h1 class="text-3xl font-bold">Ta sortie arrive bientôt…</h1>
    <RouterLink to="/" class="underline">← Retour</RouterLink>
  </main>
</template>
