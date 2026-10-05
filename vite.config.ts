import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Empty prefix: load CINEMA_API_KEY / TICKETMASTER_KEY (not VITE_-prefixed) so they never reach the client bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), tailwindcss()],
    server: {
      proxy: {
        '/api/cinema': {
          target: 'https://api.api-cinema.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cinema/, '/v1'),
          headers: { Authorization: `Bearer ${env.CINEMA_API_KEY ?? ''}` },
        },
        // Musées de France (Muséofile) on data.gouv.fr's tabular API, then the département lookup
        '/api/musees': {
          target: 'https://tabular-api.data.gouv.fr',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(
              /^\/api\/musees\/?/,
              '/api/resources/5ccd6238-4fb0-4b2c-b14a-581909489320/data/',
            ),
        },
        // Opening hours from OpenStreetMap (Overpass API)
        '/api/osm': {
          target: 'https://overpass-api.de',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/osm/, '/api'),
        },
        // Fallback Overpass server, used when the main one is overloaded
        '/api/overpass-mirror': {
          target: 'https://overpass.openstreetmap.fr',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/overpass-mirror/, '/api'),
        },
        '/api/overpass-mirror2': {
          target: 'https://lz4.overpass-api.de',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/overpass-mirror2/, '/api'),
        },
        // Place search (addresses, cities) for the location field
        '/api/adresse': {
          target: 'https://api-adresse.data.gouv.fr',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/adresse/, ''),
        },
        '/api/geo': {
          target: 'https://geo.api.gouv.fr',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/geo/, ''),
        },
        // Public open data, no key: proxied only to avoid CORS surprises
        '/api/sports': {
          target: 'https://equipements.sports.gouv.fr',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/api\/sports/, '/api/explore/v2.1/catalog/datasets'),
        },
        '/api/ticketmaster': {
          target: 'https://app.ticketmaster.com',
          changeOrigin: true,
          // Ticketmaster only accepts the key as a query param, so append it server-side
          rewrite: (path) =>
            path.replace(/^\/api\/ticketmaster/, '/discovery/v2') +
            `&apikey=${encodeURIComponent(env.TICKETMASTER_KEY ?? '')}`,
        },
      },
    },
  }
})
