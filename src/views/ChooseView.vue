<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CATEGORIES, MORE_CATEGORIES, useSearchStore } from '../stores/search'

const search = useSearchStore()
const router = useRouter()
const showMore = ref(false)

const visibleCategories = computed(() =>
  showMore.value ? [...CATEGORIES, ...MORE_CATEGORIES] : CATEGORIES,
)
</script>

<template>
  <main
    class="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-6 text-center text-white"
  >
    <p class="text-white/70">
      {{ search.location }} · {{ search.hour !== null ? search.formatHour(search.hour) : '' }}
    </p>
    <h1 class="text-3xl font-bold">Tu as envie de quoi ?</h1>
    <p class="-mt-4 text-sm text-white/50">Tu peux en choisir plusieurs</p>

    <div class="grid w-full max-w-md grid-cols-2 gap-4">
      <button
        v-for="c in visibleCategories"
        :key="c.id"
        type="button"
        class="flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-8 text-xl font-bold transition hover:scale-105"
        :class="
          search.categories.includes(c.id)
            ? 'border-fuchsia-500 bg-fuchsia-500/20'
            : 'border-white/20 bg-white/5 hover:bg-white/10'
        "
        :aria-pressed="search.categories.includes(c.id)"
        @click="search.toggleCategory(c.id)"
      >
        <span class="text-5xl">{{ c.emoji }}</span>
        {{ c.label }}
      </button>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-4">
      <button
        v-if="!showMore"
        type="button"
        class="rounded-full border-2 border-white/30 px-8 py-4 text-xl font-bold transition hover:scale-105 hover:bg-white/10"
        @click="showMore = true"
      >
        ➕ Plus de choix
      </button>
      <button
        type="button"
        :disabled="search.categories.length === 0"
        class="rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-12 py-4 text-xl font-bold shadow-lg transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        @click="router.push({ name: 'suggestion' })"
      >
        GO 🚀
      </button>
    </div>

    <RouterLink to="/" class="underline">← Retour</RouterLink>
  </main>
</template>
