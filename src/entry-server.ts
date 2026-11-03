import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory } from 'vue-router'
import App from './App.vue'
import { createAppRouter } from './router'
import { SEO_PAGES } from './seo/site'

// Build-time rendering only: no geolocation, API calls or personal browser storage.
export async function renderPage(path: string) {
  const router = createAppRouter(createMemoryHistory())
  const app = createSSRApp(App).use(createPinia()).use(router)
  await router.push(path)
  await router.isReady()
  return {
    html: await renderToString(app),
    seo: SEO_PAGES[String(router.currentRoute.value.name)] ?? SEO_PAGES.notFound!,
  }
}
