import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createServer } from 'vite'

let server, pizza, restaurants, bars, overpass, cachedOverpass, bbox
const originalFetch = globalThis.fetch
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const storage = new Map()
const localStorage = new Proxy({
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}, { ownKeys: () => [...storage.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) })

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true })
  server = await createServer({
    configFile: false,
    cacheDir: 'node_modules/.vite-venue-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  })
  ;({ fetchNearbyPizzerias: pizza } = await server.ssrLoadModule('/src/services/pizza.ts'))
  ;({ fetchNearbyRestaurants: restaurants } = await server.ssrLoadModule('/src/services/restaurants.ts'))
  ;({ fetchNearbyBars: bars } = await server.ssrLoadModule('/src/services/bars.ts'))
  ;({ overpass, cachedOverpass, bbox } = await server.ssrLoadModule('/src/services/overpass.ts'))
})
afterEach(() => { globalThis.fetch = originalFetch; storage.clear() })
after(async () => {
  await server?.close()
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
})

const response = (elements) => Response.json({ elements })
const queryOf = (url) => new URL(url, 'http://localhost').searchParams.get('data')
const tick = () => new Promise((resolve) => setImmediate(resolve))
const venue = (id, lat, lng, tags = {}) => ({ type: 'node', id, lat, lon: lng, tags: { name: `Lieu ${id}`, amenity: 'restaurant', ...tags } })
const waitFor = async (condition) => {
  for (let i = 0; i < 100; i++) { if (condition()) return; await tick() }
  assert.fail('Expected progressive update did not arrive')
}

// Each test uses different coordinates/queries so its in-memory cache is independent.
test('three categories share two queries, display nearby results first, then merge and filter the full area', async () => {
  const lat = 48.936, lng = 2.357
  const near = [venue(1, lat, lng, { cuisine: 'italian;pizza', takeaway: 'yes' }), venue(2, lat, lng, { cuisine: 'french' }), venue(3, lat, lng, { amenity: 'pub' })]
  const far = [venue(4, lat + 0.008, lng, { cuisine: 'pizza' }), venue(5, lat + 0.016, lng), venue(6, lat, lng, { cuisine: 'burger' }), venue(7, lat, lng, { cuisine: 'pizza', opening_hours: 'Mo-Su off' })]
  let complete, calls = 0
  globalThis.fetch = async (url) => {
    calls++
    if (queryOf(url).includes(bbox(lat, lng, 0.4))) return response(near)
    return new Promise((resolve) => { complete = () => resolve(response([...near, ...far])) })
  }
  const partial = [[], [], []]
  const tasks = [pizza, restaurants, bars].map((load, i) => load(lat, lng, 19, (items) => partial[i].push(items)))
  await waitFor(() => partial.every((updates) => updates.length) && complete)
  assert.deepEqual(partial.map((updates) => updates[0].map((item) => item.id)), [['node/1'], ['node/2'], ['node/3']])
  assert.equal(calls, 2, 'in-flight requests must be shared across all categories')
  complete()
  const results = await Promise.all(tasks)
  assert.deepEqual(results.map((items) => items.map((item) => item.id)), [['node/1', 'node/4'], ['node/2'], ['node/3']])
  assert.equal(results[0][0].places[0].services.includes('takeaway'), true)
  assert.equal(calls, 2)
  const cached = await pizza(lat, lng, 19)
  assert.equal(cached.length, 2)
  assert.equal(calls, 2, 'fresh full-area cache must skip both network phases')
})

test('a failed small query still attempts the full area', async () => {
  const lat = 48.94, lng = 2.36
  globalThis.fetch = async (url) => {
    if (queryOf(url).includes(bbox(lat, lng, 0.4))) return new Response('', { status: 503 })
    return response([venue(10, lat, lng, { cuisine: 'pizza' })])
  }
  assert.equal((await pizza(lat, lng, 19))[0].id, 'node/10')
})

test('a failed expansion preserves first results and reports that the list is incomplete', async () => {
  const lat = 48.95, lng = 2.37
  let shown
  globalThis.fetch = async (url) => queryOf(url).includes(bbox(lat, lng, 0.4))
    ? response([venue(20, lat, lng, { amenity: 'bar' })]) : new Response('', { status: 504 })
  await assert.rejects(bars(lat, lng, 19, (items) => { shown = items }), /premières adresses/)
  assert.equal(shown[0].id, 'node/20')
})

test('persistent stale data displays before refresh, is recalculated for the hour, and survives an outage', async () => {
  const lat = 48.96, lng = 2.38
  let fullQuery
  globalThis.fetch = async (url) => {
    const query = queryOf(url)
    if (!query.includes(bbox(lat, lng, 0.4))) fullQuery = query
    return response([venue(30, lat, lng, { cuisine: 'pizza' })])
  }
  await pizza(lat, lng, 19)
  // Simulate a persistent entry newer than the expired in-memory copy by advancing the clock.
  const now = Date.now
  Date.now = () => now() + 11 * 60_000
  try {
    assert.equal(cachedOverpass(fullQuery).fresh, false)
    let shown
    globalThis.fetch = async () => new Response('', { status: 503 })
    await assert.rejects(pizza(lat, lng, 20, (items) => { shown = items }), /cache affichées/)
    assert.equal(shown[0].id, 'node/30')
    assert.equal(shown[0].tags.includes('Données en cache'), true)
    Date.now = () => now() + 8 * 24 * 60 * 60_000
    assert.equal(cachedOverpass(fullQuery), null)
  } finally { Date.now = now }
})

test('successful refresh replaces obsolete cached places', async () => {
  const lat = 48.97, lng = 2.39
  globalThis.fetch = async () => response([venue(40, lat, lng, { cuisine: 'pizza' })])
  await pizza(lat, lng, 19)
  const now = Date.now
  Date.now = () => now() + 11 * 60_000
  try {
    let shown
    globalThis.fetch = async () => response([])
    const updated = await pizza(lat, lng, 19, (items) => { shown = items })
    assert.equal(shown[0].id, 'node/40')
    assert.deepEqual(updated, [])
  } finally { Date.now = now }
})

test('runtime-error HTTP 200 responses are rejected and never cached; a retry can succeed', async () => {
  const query = '[out:json];node(42);out;'
  globalThis.fetch = async () => Response.json({ elements: [], remark: 'runtime error: Query timed out' })
  await assert.rejects(overpass(query))
  assert.equal(cachedOverpass(query), null)
  globalThis.fetch = async () => response([venue(42, 48, 2)])
  assert.equal((await overpass(query)).length, 1)
})

test('stalled requests respect the deadline and abort the network fetch', async () => {
  let signal
  globalThis.fetch = (_url, options) => { signal = options.signal; return new Promise(() => {}) }
  const start = performance.now()
  await assert.rejects(overpass('deadline-test', { timeoutMs: 30 }))
  assert.equal(signal.aborted, true)
  assert.ok(performance.now() - start < 1000)
})


test('fresh raw cache recalculates opening hours without another network request', async () => {
  const lat = 48.98, lng = 2.40
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return response([venue(50, lat, lng, { cuisine: 'pizza', opening_hours: 'Mo-Su 12:00-18:00' })])
  }
  assert.equal((await pizza(lat, lng, 13)).length, 1)
  assert.equal((await pizza(lat, lng, 19)).length, 0)
  assert.equal(calls, 2)
})
