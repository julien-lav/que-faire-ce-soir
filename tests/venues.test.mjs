import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createServer } from 'vite'

let server, pizza, restaurants, bars, overpass, cachedOverpass, bbox, proxyGeoapify, favoriteUtils, worker
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
  ;({ proxyGeoapify } = await server.ssrLoadModule('/server/geoapifyProxy.ts'))
  favoriteUtils = await server.ssrLoadModule('/src/services/personalFavorites.ts')
  ;({ default: worker } = await server.ssrLoadModule('/worker/index.ts'))
})
afterEach(() => { globalThis.fetch = originalFetch; storage.clear() })
after(async () => {
  await server?.close()
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
})

const osmOnly = (fetcher) => (url, options) => String(url).startsWith('/api/geoapify/')
  ? Promise.resolve(new Response('', { status: 503 })) : fetcher(url, options)
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
  globalThis.fetch = osmOnly(async (url) => {
    calls++
    if (queryOf(url).includes(bbox(lat, lng, 0.4))) return response(near)
    return new Promise((resolve) => { complete = () => resolve(response([...near, ...far])) })
  })
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
  globalThis.fetch = osmOnly(async (url) => {
    if (queryOf(url).includes(bbox(lat, lng, 0.4))) return new Response('', { status: 503 })
    return response([venue(10, lat, lng, { cuisine: 'pizza' })])
  })
  assert.equal((await pizza(lat, lng, 19))[0].id, 'node/10')
})

test('a failed expansion preserves first results and reports that the list is incomplete', async () => {
  const lat = 48.95, lng = 2.37
  let shown
  globalThis.fetch = osmOnly(async (url) => queryOf(url).includes(bbox(lat, lng, 0.4))
    ? response([venue(20, lat, lng, { amenity: 'bar' })]) : new Response('', { status: 504 }))
  await assert.rejects(bars(lat, lng, 19, (items) => { shown = items }), /premières adresses/)
  assert.equal(shown[0].id, 'node/20')
})

test('persistent stale data displays before refresh, is recalculated for the hour, and survives an outage', async () => {
  const lat = 48.96, lng = 2.38
  let fullQuery
  globalThis.fetch = osmOnly(async (url) => {
    const query = queryOf(url)
    if (!query.includes(bbox(lat, lng, 0.4))) fullQuery = query
    return response([venue(30, lat, lng, { cuisine: 'pizza' })])
  })
  await pizza(lat, lng, 19)
  // Simulate a persistent entry newer than the expired in-memory copy by advancing the clock.
  const now = Date.now
  Date.now = () => now() + 11 * 60_000
  try {
    assert.equal(cachedOverpass(fullQuery).fresh, false)
    let shown
    globalThis.fetch = osmOnly(async () => new Response('', { status: 503 }))
    await assert.rejects(pizza(lat, lng, 20, (items) => { shown = items }), /cache affichées/)
    assert.equal(shown[0].id, 'node/30')
    assert.equal(shown[0].tags.includes('Données en cache'), true)
    Date.now = () => now() + 8 * 24 * 60 * 60_000
    assert.equal(cachedOverpass(fullQuery), null)
  } finally { Date.now = now }
})

test('successful refresh replaces obsolete cached places', async () => {
  const lat = 48.97, lng = 2.39
  globalThis.fetch = osmOnly(async () => response([venue(40, lat, lng, { cuisine: 'pizza' })]))
  await pizza(lat, lng, 19)
  const now = Date.now
  Date.now = () => now() + 11 * 60_000
  try {
    let shown
    globalThis.fetch = osmOnly(async () => response([]))
    const updated = await pizza(lat, lng, 19, (items) => { shown = items })
    assert.equal(shown[0].id, 'node/40')
    assert.deepEqual(updated, [])
  } finally { Date.now = now }
})

test('runtime-error HTTP 200 responses are rejected and never cached; a retry can succeed', async () => {
  const query = '[out:json];node(42);out;'
  globalThis.fetch = osmOnly(async () => Response.json({ elements: [], remark: 'runtime error: Query timed out' }))
  await assert.rejects(overpass(query))
  assert.equal(cachedOverpass(query), null)
  globalThis.fetch = osmOnly(async () => response([venue(42, 48, 2)]))
  assert.equal((await overpass(query)).length, 1)
})

test('stalled requests respect the deadline and abort the network fetch', async () => {
  let signal
  globalThis.fetch = osmOnly((_url, options) => { signal = options.signal; return new Promise(() => {}) })
  const start = performance.now()
  await assert.rejects(overpass('deadline-test', { timeoutMs: 30 }))
  assert.equal(signal.aborted, true)
  assert.ok(performance.now() - start < 1000)
})


test('fresh raw cache recalculates opening hours without another network request', async () => {
  const lat = 48.98, lng = 2.40
  let calls = 0
  globalThis.fetch = osmOnly(async () => {
    calls++
    return response([venue(50, lat, lng, { cuisine: 'pizza', opening_hours: 'Mo-Su 12:00-18:00' })])
  })
  assert.equal((await pizza(lat, lng, 13)).length, 1)
  assert.equal((await pizza(lat, lng, 19)).length, 0)
  assert.equal(calls, 2)
})


const geoResponse = (features) => Response.json({ type: 'FeatureCollection', features })
const geoPlace = (id, lat, lng, extra = {}) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { name: `Adresse ${id}`, lat, lon: lng, place_id: `place-${id}`, categories: ['catering.restaurant.pizza'],
    datasource: { raw: { osm_type: 'w', osm_id: id, cuisine: 'italian;pizza', amenity: 'restaurant', opening_hours: '24/7', takeaway: 'yes' } },
    ...extra } })

test('Geoapify is primary, shared in flight, and preserves OSM identity, hours, services and favorites', async () => {
  const lat = 49.1, lng = 2.5
  let calls = 0
  globalThis.fetch = async (url) => {
    calls++
    assert.ok(String(url).startsWith('/api/geoapify/places?'))
    assert.ok(!String(url).includes('apiKey'))
    return geoResponse([geoPlace(101, lat, lng, { street: 'Rue du Test', housenumber: '12', city: 'Saint-Denis',
      contact: { phone: '+33123456789' }, website: 'https://example.com/' }), geoPlace(101, lat, lng),
      geoPlace(102, lat + 0.03, lng)])
  }
  const [first, second] = await Promise.all([pizza(lat, lng, 19), pizza(lat, lng, 19)])
  assert.equal(calls, 1)
  assert.deepEqual(first, second)
  assert.equal(first.length, 1)
  const place = first[0].places[0]
  assert.equal(place.id, 'way/101')
  assert.equal(place.source, 'geoapify')
  assert.equal(place.phone, '+33123456789')
  assert.equal(place.websiteUrl, 'https://example.com/')
  assert.equal(place.address, '12 Rue du Test, Saint-Denis')
  assert.equal(place.status.open, true)
  assert.ok(place.services.includes('takeaway'))
  const saved = favoriteUtils.createPersonalFavorite('pizza', first[0], place)
  const restored = favoriteUtils.parsePersonalFavorites(favoriteUtils.serializePersonalFavorites([saved]))
  assert.equal(restored[0].item.places[0].source, 'geoapify')
  assert.equal(restored[0].item.places[0].id, 'way/101')
  await pizza(lat, lng, 19)
  assert.equal(calls, 1, 'fresh Geoapify cache skips both APIs')
})

test('Geoapify properties work without raw OSM tags, without inventing hours or an OSM id', async () => {
  const lat = 49.11, lng = 2.51
  globalThis.fetch = async () => geoResponse([geoPlace(110, lat, lng, {
    datasource: undefined, categories: ['catering.pub'], address_line2: 'Rue du Pub, Saint-Denis',
  })])
  const result = await bars(lat, lng, 19)
  const place = result[0].places[0]
  assert.equal(place.id, 'geoapify:place-110')
  assert.equal(place.status, undefined)
  assert.equal(place.detail, 'Horaires non renseignés')
  assert.equal(place.address, 'Rue du Pub, Saint-Denis')
  assert.deepEqual(result[0].tags, ['Pub'])
})

test('Geoapify HTTP error immediately falls back to the existing progressive OSM search', async () => {
  const lat = 49.12, lng = 2.52
  let geo = 0, osm = 0, partial
  globalThis.fetch = async (url) => {
    if (String(url).startsWith('/api/geoapify/')) { geo++; return new Response('', { status: 401 }) }
    osm++
    return response([venue(120, lat, lng, { cuisine: 'pizza' })])
  }
  const result = await pizza(lat, lng, 19, (items) => { partial = items })
  assert.equal(geo, 1)
  assert.equal(osm, 2)
  assert.equal(partial[0].id, 'node/120')
  assert.equal(result[0].places[0].source, 'openstreetmap')
})

test('slow Geoapify is aborted after four seconds, then OSM provides results', async () => {
  const lat = 49.13, lng = 2.53
  let signal, osm = 0
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('/api/geoapify/')) {
      signal = options.signal
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
    }
    osm++
    return response([venue(130, lat, lng, { cuisine: 'pizza' })])
  }
  const start = performance.now()
  const result = await pizza(lat, lng, 19)
  assert.equal(signal.aborted, true)
  assert.equal(result[0].id, 'node/130')
  assert.equal(osm, 2)
  assert.ok(performance.now() - start >= 3900)
  assert.ok(performance.now() - start < 6000)
})

test('a valid empty Geoapify answer does not trigger more requests', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return geoResponse([]) }
  assert.deepEqual(await pizza(49.14, 2.54, 19), [])
  assert.equal(calls, 1)
})

test('malformed Geoapify data triggers OSM rather than pretending there are no addresses', async () => {
  const lat = 49.15, lng = 2.55
  let calls = 0
  globalThis.fetch = async (url) => {
    calls++
    return String(url).startsWith('/api/geoapify/') ? Response.json({ features: [] })
      : response([venue(150, lat, lng, { cuisine: 'pizza' })])
  }
  assert.equal((await pizza(lat, lng, 19))[0].id, 'node/150')
  assert.equal(calls, 3)
})

test('stale Geoapify cache stays visible if both providers fail', async () => {
  const lat = 49.16, lng = 2.56
  globalThis.fetch = async () => geoResponse([geoPlace(160, lat, lng)])
  await pizza(lat, lng, 19)
  const now = Date.now
  Date.now = () => now() + 11 * 60_000
  try {
    let shown
    globalThis.fetch = async () => new Response('', { status: 503 })
    await assert.rejects(pizza(lat, lng, 19, (items) => { shown = items }), /cache affichées/)
    assert.equal(shown[0].id, 'way/160')
    assert.ok(shown[0].tags.includes('Données en cache'))
  } finally { Date.now = now }
})

test('Geoapify raw cache recalculates hours for a new selected hour', async () => {
  const lat = 49.17, lng = 2.57
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return geoResponse([geoPlace(170, lat, lng, { opening_hours: 'Mo-Su 12:00-18:00', datasource: undefined })])
  }
  assert.equal((await pizza(lat, lng, 13)).length, 1)
  assert.equal((await pizza(lat, lng, 19)).length, 0)
  assert.equal(calls, 1)
})

const proxyRequest = (params = '') => new Request('https://example.com/api/geoapify/places?categories=catering.restaurant&filter=circle:2.357,48.936,1500' + params)

test('Geoapify proxy keeps the key server-side, fixes request limits and sanitizes upstream failures', async () => {
  let upstream
  globalThis.fetch = async (url) => { upstream = new URL(url); return geoResponse([]) }
  const result = await proxyGeoapify(proxyRequest('&apiKey=untrusted&limit=500'), 'server-only-key')
  assert.equal(result.status, 200)
  assert.equal(upstream.origin, 'https://api.geoapify.com')
  assert.equal(upstream.pathname, '/v2/places')
  assert.equal(upstream.searchParams.get('apiKey'), 'server-only-key')
  assert.equal(upstream.searchParams.get('limit'), '40')
  assert.equal(upstream.searchParams.get('bias'), 'proximity:2.357,48.936')
  assert.ok(!(await result.text()).includes('server-only-key'))
  globalThis.fetch = async () => new Response('Sensitive URL?apiKey=server-only-key', { status: 403 })
  const error = await proxyGeoapify(proxyRequest(), 'server-only-key')
  assert.equal(error.status, 403)
  assert.ok(!(await error.text()).includes('server-only-key'))
})

test('missing key and invalid proxy requests do not make upstream calls', async () => {
  globalThis.fetch = async () => { assert.fail('No upstream call expected') }
  assert.equal((await proxyGeoapify(proxyRequest(), undefined)).status, 503)
  assert.equal((await proxyGeoapify(new Request('https://example.com/api/geoapify/other'), 'key')).status, 404)
  assert.equal((await proxyGeoapify(new Request('https://example.com/api/geoapify/places?categories=hotel&filter=circle:2,48,1500'), 'key')).status, 400)
  assert.equal((await proxyGeoapify(new Request('https://example.com/api/geoapify/places?categories=catering.restaurant&filter=circle:2,99,1500'), 'key')).status, 400)
})

test('the production Worker exposes the same Geoapify route and reads its secret', async () => {
  let key
  globalThis.fetch = async (url) => { key = new URL(url).searchParams.get('apiKey'); return geoResponse([]) }
  const response = await worker.fetch(proxyRequest(), { GEOAPIFY_API_KEY: 'worker-secret' }, { waitUntil() {} })
  assert.equal(response.status, 200)
  assert.equal(key, 'worker-secret')
})
