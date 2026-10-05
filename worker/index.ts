// Production equivalent of the dev proxies in vite.config.ts (Cloudflare Worker).
// Secrets (CINEMA_API_KEY, TICKETMASTER_KEY) are read from the Pages environment, never shipped to the browser.
interface Env {
  CINEMA_API_KEY?: string
  TICKETMASTER_KEY?: string
}

interface Route {
  target: string
  // Path after the /api/<name> prefix (keeps its leading slash, may be empty)
  rewrite: (rest: string) => string
  headers?: (env: Env) => Record<string, string>
  query?: (env: Env) => Record<string, string>
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

const TIMEOUT_MS = 20_000

const MUSEES = '/api/resources/5ccd6238-4fb0-4b2c-b14a-581909489320/data'

const ROUTES: Record<string, Route> = {
  cinema: {
    target: 'https://api.api-cinema.com',
    rewrite: (rest) => `/v1${rest}`,
    headers: (env) => ({ Authorization: `Bearer ${(env.CINEMA_API_KEY ?? '').trim()}` }),
  },
  musees: {
    target: 'https://tabular-api.data.gouv.fr',
    rewrite: (rest) => `${MUSEES}${rest || '/'}`,
  },
  osm: { target: 'https://overpass-api.de', rewrite: (rest) => `/api${rest}` },
  'overpass-mirror': { target: 'https://overpass.kumi.systems', rewrite: (rest) => `/api${rest}` },
  'overpass-mirror2': { target: 'https://overpass.private.coffee', rewrite: (rest) => `/api${rest}` },
  adresse: { target: 'https://api-adresse.data.gouv.fr', rewrite: (rest) => rest },
  geo: { target: 'https://geo.api.gouv.fr', rewrite: (rest) => rest },
  sports: {
    target: 'https://equipements.sports.gouv.fr',
    rewrite: (rest) => `/api/explore/v2.1/catalog/datasets${rest}`,
  },
  ticketmaster: {
    target: 'https://app.ticketmaster.com',
    rewrite: (rest) => `/discovery/v2${rest}`,
    query: (env) => ({ apikey: (env.TICKETMASTER_KEY ?? '').trim() }),
  },
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })

    const [, , name, ...tail] = url.pathname.split('/') // ['', 'api', name, ...]
    const route = name ? ROUTES[name] : undefined
    if (!route) return new Response('Not found', { status: 404 })

    const upstream = new URL(route.rewrite(tail.length ? `/${tail.join('/')}` : ''), route.target)
    upstream.search = url.search
    for (const [k, v] of Object.entries(route.query?.(env) ?? {})) upstream.searchParams.set(k, v)

    // Public Overpass servers are slow and sometimes stall: cache good answers, and give up on a stalled
    // one so the app can move on to another mirror
    const cacheable = name === 'osm' || name.startsWith('overpass-')
    const cache = (caches as unknown as { default: Cache }).default
    const cacheKey = new Request(upstream.toString())
    if (cacheable) {
      const hit = await cache.match(cacheKey)
      if (hit) return hit
    }

    let res: Response
    try {
      res = await fetch(upstream, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          Accept: 'application/json',
          'User-Agent': 'que-faire-ce-soir/1.0 (+https://que-faire-ce-soir.julien-laville.workers.dev)',
          ...route.headers?.(env),
        },
      })
    } catch {
      return new Response('Upstream timeout', { status: 504 })
    }

    const out = new Response(res.body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
        ...(cacheable && res.ok ? { 'Cache-Control': 'public, max-age=600' } : {}),
      },
    })
    if (cacheable && res.ok) ctx.waitUntil(cache.put(cacheKey, out.clone()))
    return out
  },
}
