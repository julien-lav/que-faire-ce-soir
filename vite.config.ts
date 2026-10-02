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
