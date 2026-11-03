<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LocationPicker from '../components/LocationPicker.vue'
import TimeSelector from '../components/TimeSelector.vue'
import { useSearchStore } from '../stores/search'
import { HOME_INTRO } from '../seo/site'

const search = useSearchStore()
const router = useRouter()

// Find the position now, so a failure is known (and an address asked) before any search starts
onMounted(() => search.locateNow())

const ready = () => search.hour !== null && search.locationStatus !== 'needs-address'

function surprise() {
  if (!ready()) return
  search.startSurprise()
  router.push({ name: 'suggestion', query: { mode: 'surprise' } })
}

function choose() {
  if (!ready()) return
  router.push({ name: 'choose' })
}
</script>

<template>
  <main
    class="page-shell flex flex-col items-center justify-center gap-6 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8 text-center text-white"
  >
    <h1 class="text-3xl font-extrabold tracking-wide sm:text-5xl">QUE FAIRE CE SOIR ?</h1>

    <LocationPicker />

    <section class="flex w-full max-w-xl flex-col items-center gap-4">
      <h2 class="text-lg text-white/70">À quelle heure ?</h2>
      <TimeSelector />
    </section>

    <div class="flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
      <button
        type="button"
        :disabled="!ready()"
        class="w-full max-w-sm rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-base font-bold sm:w-auto sm:max-w-none sm:px-8 sm:py-4 sm:text-xl shadow-lg transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        @click="choose"
      >
        🎯 JE CHOISIS MES ACTIVITÉS
      </button>
      <button
        type="button"
        :disabled="!ready()"
        class="w-full max-w-sm rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-4 py-3 text-base font-bold sm:w-auto sm:max-w-none sm:px-8 sm:py-4 sm:text-xl shadow-lg transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        @click="surprise"
      >
        ✨ SURPRENDS-MOI
      </button>
    </div>

    <p class="max-w-xl text-sm leading-relaxed text-white/65">{{ HOME_INTRO }}</p>
  </main>
</template>
