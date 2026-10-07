<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LocationPicker from '../components/LocationPicker.vue'
import TimeSelector from '../components/TimeSelector.vue'
import { useSearchStore } from '../stores/search'

const search = useSearchStore()
const router = useRouter()

// Find the position now, so a failure is known (and an address asked) before any search starts
onMounted(() => search.locateNow())

const ready = () => search.hour !== null && search.locationStatus !== 'needs-address'

function surprise() {
  if (!ready()) return
  router.push({ name: 'suggestion' })
}

function choose() {
  if (!ready()) return
  router.push({ name: 'choose' })
}
</script>

<template>
  <main
    class="flex min-h-screen flex-col items-center justify-center gap-10 px-6 text-center text-white"
  >
    <h1 class="text-4xl font-extrabold tracking-wide sm:text-5xl">QUE FAIRE CE SOIR ?</h1>

    <LocationPicker />

    <section class="flex flex-col items-center gap-4">
      <h2 class="text-lg text-white/70">À quelle heure ?</h2>
      <TimeSelector />
    </section>

    <div class="flex flex-wrap items-center justify-center gap-4">
      <button
        type="button"
        :disabled="!ready()"
        class="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-8 py-4 text-xl font-bold shadow-lg transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        @click="choose"
      >
        🎯 JE CHOISIS MES ACTIVITÉS
      </button>
      <button
        type="button"
        :disabled="!ready()"
        class="rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-8 py-4 text-xl font-bold shadow-lg transition enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        @click="surprise"
      >
        ✨ SURPRENDS-MOI
      </button>
    </div>
  </main>
</template>
