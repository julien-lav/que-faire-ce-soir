<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const SHOW_AFTER_PX = 400
const visible = ref(false)

const onScroll = () => {
  visible.value = window.scrollY > SHOW_AFTER_PX
}

const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <button
    v-if="visible"
    type="button"
    aria-label="Retour en haut"
    class="fixed right-4 bottom-14 z-50 flex size-11 items-center justify-center rounded-full bg-fuchsia-600 text-xl text-white shadow-lg transition hover:bg-fuchsia-500"
    @click="toTop"
  >
    ↑
  </button>
</template>
