import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

const server = await createServer({
  configFile: false,
  plugins: [vue()],
  cacheDir: 'node_modules/.vite-prerender',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false },
  appType: 'custom',
})
try {
  const { renderPage } = await server.ssrLoadModule('/src/entry-server.ts')
  const { seoHead, robotsTxt, sitemapXml } = await server.ssrLoadModule('/src/seo/site.ts')
  const template = await readFile('dist/index.html', 'utf8')
  if (!template.includes('<!--app-html-->') || !template.includes('<!--seo-start-->')) throw new Error('Prerender placeholders are missing')
  for (const [path, filename] of [['/', 'index.html'], ['/choix', 'choix.html'], ['/suggestion', 'suggestion.html'], ['/favoris', 'favoris.html'], ['/page-introuvable', '404.html']]) {
    const { html, seo } = await renderPage(path)
    const document = template.replace(/<!--seo-start-->[\s\S]*?<!--seo-end-->/, `<!--seo-start-->${seoHead(seo)}<!--seo-end-->`)
      .replace('<!--app-html-->', html)
    await writeFile(`dist/${filename}`, document)
  }
  await writeFile('dist/robots.txt', robotsTxt())
  await writeFile('dist/sitemap.xml', sitemapXml())
  console.log('Prerendered 5 pages, robots.txt and sitemap.xml')
} finally {
  await server.close()
}
