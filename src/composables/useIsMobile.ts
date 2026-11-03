import { onScopeDispose, ref } from 'vue'

// Matches Tailwind's `md` breakpoint (768px): below it, layouts are single-column
const QUERY = '(max-width: 767px)'

export function useIsMobile() {
  const mql = typeof window !== 'undefined' ? window.matchMedia(QUERY) : undefined
  const isMobile = ref(mql?.matches ?? false)
  const onChange = (e: MediaQueryListEvent) => {
    isMobile.value = e.matches
  }

  mql?.addEventListener('change', onChange)
  onScopeDispose(() => mql?.removeEventListener('change', onChange))

  return isMobile
}
