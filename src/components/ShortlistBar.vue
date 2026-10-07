<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useShortlistStore } from '../stores/shortlist'

const shortlist = useShortlistStore()
const feedback = ref<'copied' | 'failed' | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  feedback.value = (await shortlist.copy()) ? 'copied' : 'failed'
  clearTimeout(timer)
  timer = setTimeout(() => (feedback.value = null), 2000)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <!-- Sits right above the back-to-top arrow (BackToTop.vue) -->
  <div
    v-if="shortlist.count > 0"
    class="fixed right-4 bottom-[7.25rem] z-50 flex items-center gap-1 rounded-full bg-fuchsia-600 pr-1 pl-4 text-white shadow-lg"
  >
    <button type="button" class="py-2 text-sm font-bold" role="status" @click="copy">
      {{
        feedback === 'copied'
          ? '✓ Copié !'
          : feedback === 'failed'
            ? 'Copie impossible'
            : `📋 Copier mes choix (${shortlist.count})`
      }}
    </button>
    <button
      type="button"
      aria-label="Vider ma sélection"
      title="Vider ma sélection"
      class="flex size-8 items-center justify-center rounded-full text-white/80 hover:bg-white/20"
      @click="shortlist.clear()"
    >
      ✕
    </button>
  </div>
</template>
