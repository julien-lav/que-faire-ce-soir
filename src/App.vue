<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import BackToTop from './components/BackToTop.vue'

const route = useRoute()
const router = useRouter()

// Previous page when there is one in this app, home otherwise (e.g. a page opened from a shared link)
const goBack = () => (window.history.state?.back ? router.back() : router.push('/'))
</script>

<template>
  <button
    v-if="route.name !== 'home'"
    type="button"
    aria-label="Retour"
    title="Retour"
    class="absolute top-4 left-4 z-40 text-white/60 transition hover:text-white"
    @click="goBack"
  >
    <svg
      viewBox="0 0 24 24"
      class="size-6"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  </button>
  <a
    href="https://github.com/julien-lav/que-faire-ce-soir"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Code source sur GitHub"
    title="Code source sur GitHub"
    class="absolute top-4 right-4 z-40 text-white/60 transition hover:text-white"
  >
    <svg viewBox="0 0 16 16" class="size-6" fill="currentColor" aria-hidden="true">
      <path
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  </a>
  <RouterView />
  <BackToTop />
  <!-- Spacer so the fixed footer never hides the bottom of a page -->
  <div class="h-10" aria-hidden="true"></div>
  <footer
    class="fixed inset-x-0 bottom-0 z-40 bg-slate-950/70 py-2 text-center text-xs text-white/60 backdrop-blur-sm"
  >
    <a
      href="https://github.com/julien-lav/que-faire-ce-soir"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-white hover:underline"
    >
      © 2026 · Made with ❤️ by julien-lav
    </a>
  </footer>
</template>
