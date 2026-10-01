<script setup lang="ts">
import { ref } from 'vue'
import { useSearchStore } from '../stores/search'

const search = useSearchStore()
const editing = ref(false)
const draft = ref('')

function edit() {
  draft.value = search.location
  editing.value = true
}

function save() {
  if (draft.value.trim()) search.location = draft.value.trim()
  editing.value = false
}
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <p v-if="!editing" class="text-xl">📍 {{ search.location }}</p>
    <input
      v-else
      v-model="draft"
      autofocus
      class="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-white outline-none"
      @keyup.enter="save"
      @blur="save"
    />
    <button
      v-if="!editing"
      type="button"
      class="rounded-lg border border-white/20 px-4 py-1 text-sm hover:bg-white/10"
      @click="edit"
    >
      Changer de lieu
    </button>
  </div>
</template>
