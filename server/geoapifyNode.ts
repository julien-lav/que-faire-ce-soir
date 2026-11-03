import { request } from 'node:https'

// Local development only. Node's short automatic IPv4/IPv6 connection attempts can
// fail before a slower network connects; use the OS-selected address for this API.
// The proxy's abort signal still bounds the complete request, including the body.
export const fetchGeoapifyFromNode: typeof fetch = (input, init) => new Promise((resolve, reject) => {
  const url = input instanceof Request ? new URL(input.url) : new URL(String(input))
  const options = {
    method: 'GET',
    headers: Object.fromEntries(new Headers(init?.headers)),
    signal: init?.signal ?? undefined,
    autoSelectFamily: false,
  }
  const outgoing = request(url, options, (incoming) => {
    const chunks: Buffer[] = []
    incoming.on('data', (chunk: Buffer) => chunks.push(chunk))
    incoming.on('error', reject)
    incoming.on('aborted', () => reject(new Error('Geoapify response aborted')))
    incoming.on('end', () => {
      try {
        resolve(new Response(Buffer.concat(chunks).toString('utf8'), {
          status: incoming.statusCode ?? 502,
          headers: { 'Content-Type': incoming.headers['content-type'] ?? 'application/json' },
        }))
      } catch (error) { reject(error) }
    })
  })
  outgoing.on('error', reject)
  outgoing.end()
})
