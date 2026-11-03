// Shared by Vite and the production Worker. The API key never reaches the browser.
export async function proxyGeoapify(request: Request, apiKey: string | undefined, fetchUpstream: typeof fetch = fetch): Promise<Response> {
  const input = new URL(request.url)
  const error = (status: number, message: string) => Response.json({ error: message }, { status })
  if (request.method !== 'GET') return error(405, 'Method not allowed')
  if (input.pathname !== '/api/geoapify/places') return error(404, 'Not found')
  if (!apiKey?.trim()) return error(503, 'Geoapify is not configured')

  const categories = input.searchParams.get('categories') ?? ''
  const allowed = [
    'catering.restaurant.pizza,catering.fast_food.pizza',
    'catering.restaurant',
    'catering.bar,catering.pub',
  ]
  const circle = input.searchParams.get('filter')?.match(/^circle:([^,]+),([^,]+),([^,]+)$/)
  if (!allowed.includes(categories) || !circle) return error(400, 'Invalid place search')
  const [lng, lat, radius] = circle.slice(1).map(Number)
  if (lng === undefined || lat === undefined || radius === undefined ||
      ![lng, lat, radius].every(Number.isFinite) || Math.abs(lng) > 180 || Math.abs(lat) > 90 || radius <= 0 || radius > 2000) {
    return error(400, 'Invalid search area')
  }
  const upstream = new URL('https://api.geoapify.com/v2/places')
  upstream.search = new URLSearchParams({
    categories, filter: `circle:${lng},${lat},${radius}`, bias: `proximity:${lng},${lat}`,
    limit: '40', lang: 'fr', apiKey: apiKey.trim(),
  }).toString()
  try {
    const response = await fetchUpstream(upstream, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(4500)]),
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return error(response.status, 'Geoapify unavailable')
    // Parse while the upstream deadline is still active; never forward upstream errors or URLs.
    const data = await response.json() as { type?: unknown; features?: unknown } | null
    if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) return error(502, 'Invalid Geoapify response')
    return Response.json({ type: data.type, features: data.features })
  } catch {
    return error(504, 'Geoapify request failed or timed out')
  }
}
