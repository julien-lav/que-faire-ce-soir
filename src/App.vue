<template>
  <RouterView />
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
