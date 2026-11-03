import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

let server, useSearchStore, createAppRouter, SuggestionView
const originalFetch = globalThis.fetch
const originalRandom = Math.random

before(async () => {
  server = await createServer({
    configFile: false,
    plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  ;({ useSearchStore } = await server.ssrLoadModule('/src/stores/search.ts'))
  ;({ createAppRouter } = await server.ssrLoadModule('/src/router/index.ts'))
  ;({ default: SuggestionView } = await server.ssrLoadModule('/src/views/SuggestionView.vue'))
})
afterEach(() => { globalThis.fetch = originalFetch; Math.random = originalRandom })
after(async () => { await server?.close() })

const waitForSearch = async (search) => {
  for (let i = 0; i < 100; i++) {
    if (!search.eatLoading && !search.outLoading && !search.pizzaLoading && !search.cinemaLoading) return
    await new Promise((resolve) => setImmediate(resolve))
  }
  assert.fail('Search did not finish')
}

async function setup(path = '/suggestion?mode=surprise') {
  const pinia = createPinia()
  const search = useSearchStore(pinia)
  const router = createAppRouter(createMemoryHistory())
  const app = createSSRApp(SuggestionView).use(pinia).use(router)
  await router.push(path)
  await router.isReady()
  return { search, app }
}

test('a first surprise selects activities, loads nearby results and renders useful content', async () => {
  const { search, app } = await setup()
  assert.deepEqual(search.categories, [])
  search.hour = 19
  search.setPlace({ label: 'Saint-Denis', lat: 48.936, lng: 2.357 })
  Math.random = () => 0
  let calls = 0
  globalThis.fetch = async (url) => {
    if (String(url).startsWith('/api/geoapify/')) return new Response('', { status: 503 })
    if (String(url).includes('overpass')) {
      calls++
      return Response.json({ elements: [
        { type: 'node', id: 901, lat: 48.936, lon: 2.357, tags: { name: 'Restaurant surprise', amenity: 'restaurant', cuisine: 'french' } },
        { type: 'node', id: 902, lat: 48.936, lon: 2.357, tags: { name: 'Bar surprise', amenity: 'bar' } },
      ] })
    }
    return Response.json({ reviews: [] })
  }

  search.startSurprise()
  assert.deepEqual(search.categories, ['eat', 'out'])
  assert.equal(search.eatLoading, true)
  assert.equal(search.outLoading, true)
  await waitForSearch(search)
  assert.equal(search.eatError, null)
  assert.equal(search.outError, null)
  assert.ok(calls > 0)
  assert.equal(search.eatListings[0].title, 'Restaurant surprise')
  assert.equal(search.outListings[0].title, 'Bar surprise')

  const html = await renderToString(app)
  for (const text of ['Ton idée de sortie', 'Restaurant surprise', 'Bar surprise', 'Une autre idée', 'Choisir mes activités']) {
    assert.ok(html.includes(text), `Missing ${text}`)
  }
  assert.ok(!html.includes('Ta sortie arrive bientôt'))
})

test('another surprise replaces previous choices, clears restrictive filters and preserves place and time', async () => {
  const { search } = await setup()
  search.hour = 20
  const place = { label: 'Paris', lat: 48.8566, lng: 2.3522 }
  search.setPlace(place)
  // Keep this selection test independent of external APIs.
  globalThis.fetch = async () => new Response('', { status: 503 })
  Math.random = () => 0
  search.categories = ['eat', 'out']
  search.filters = { maxDistanceKm: 0, openOnly: true, service: 'delivery' }
  search.startSurprise()
  assert.deepEqual(search.categories, ['pizza', 'cinema'])
  assert.deepEqual(search.filters, { maxDistanceKm: null, openOnly: false, service: 'all' })
  assert.deepEqual(search.place, place)
  assert.equal(search.hour, 20)
  await waitForSearch(search)
})

test('opening results without choices offers an actionable way to start', async () => {
  const { app } = await setup('/suggestion')
  const html = await renderToString(app)
  assert.ok(html.includes('Trouvons ta prochaine sortie'))
  assert.match(html, /href="\/"[^>]*>\s*Trouver une sortie/)
  assert.ok(!html.includes('Ta sortie arrive bientôt'))
})
