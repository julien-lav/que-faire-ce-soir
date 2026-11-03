import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { test } from 'node:test'

const read = (name) => readFile(new URL(`../dist/${name}`, import.meta.url), 'utf8')
const canonical = 'https://que-faire-ce-soir.julien-laville.workers.dev/'

// Inspect shipped HTML, not only metadata after JavaScript has run.
test('homepage has crawlable French content, one title, description and canonical before JavaScript', async () => {
  const html = await read('index.html')
  assert.match(html, /<html lang="fr">/)
  assert.equal((html.match(/<title\b/g) ?? []).length, 1)
  assert.equal((html.match(/name="description"/g) ?? []).length, 1)
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1)
  assert.match(html, new RegExp(`rel="canonical" href="${canonical.replaceAll('.', '\\.')}"`))
  assert.match(html, /name="robots" content="index, follow, max-image-preview:large"/)
  assert.match(html, /<main\b/)
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1)
  assert.match(html, /Trouve une idée de sortie près de toi/)
  assert.match(html, /restaurant, pizzeria, cinéma, concert ou spectacle/)
  assert.ok(!html.includes('<!--app-html-->'))
  assert.ok(!html.includes('<!--seo-head-->'))
  assert.ok(!html.includes('src="/src/main.ts"'))
})

test('personal and state-dependent routes ship their own noindex HTML and titles', async () => {
  for (const [filename, path, title] of [['choix.html', 'choix', 'Choisir mes activités'], ['suggestion.html', 'suggestion', 'Idées de sorties'], ['favoris.html', 'favoris', 'Mes favoris']]) {
    const html = await read(filename)
    assert.match(html, /name="robots" content="noindex, follow"/)
    assert.ok(html.includes(`<title data-seo>${title} | Que faire ce soir ?</title>`))
    assert.ok(html.includes(`rel="canonical" href="${canonical}${path}"`))
    assert.ok(!html.includes('application/ld+json'))
    assert.match(html, /<main\b/)
  }
})

test('unknown routes have a real 404 asset and Cloudflare is configured to return HTTP 404', async () => {
  const html = await read('404.html')
  assert.match(html, /Cette page est introuvable/)
  assert.match(html, /name="robots" content="noindex, follow"/)
  assert.ok(!html.includes('rel="canonical"'))
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
  assert.equal(config.assets.not_found_handling, '404-page')
  assert.equal(config.assets.html_handling, 'drop-trailing-slash')
  assert.deepEqual(config.assets.run_worker_first, ['/api/*'])
})

test('sitemap advertises only the public homepage; robots allows crawlers to read noindex pages', async () => {
  const sitemap = await read('sitemap.xml'), robots = await read('robots.txt')
  assert.match(sitemap, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/)
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]), [canonical])
  assert.ok(robots.includes(`Sitemap: ${canonical}sitemap.xml`))
  assert.ok(robots.includes('Disallow: /api/'))
  assert.ok(!/Disallow: \/(?:choix|favoris|suggestion)/.test(robots))
})

test('sharing metadata points to a real 1200 × 630 PNG', async () => {
  const html = await read('index.html')
  assert.ok(html.includes(`property="og:image" content="${canonical}social-preview.png"`))
  assert.ok(html.includes('property="og:locale" content="fr_FR"'))
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'))
  const png = await readFile(new URL('../dist/social-preview.png', import.meta.url))
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
})

test('structured data describes the real website and app without invented reviews or search URLs', async () => {
  const html = await read('index.html')
  const json = html.match(/<script data-seo type="application\/ld\+json">(.*?)<\/script>/s)?.[1]
  assert.ok(json)
  const data = JSON.parse(json)
  assert.equal(data['@context'], 'https://schema.org')
  assert.deepEqual(data['@graph'].map((entry) => entry['@type']), ['WebSite', 'WebApplication'])
  for (const entry of data['@graph']) {
    assert.equal(entry.url, canonical)
    assert.equal(entry.inLanguage, 'fr-FR')
    assert.equal(entry.aggregateRating, undefined)
    assert.equal(entry.potentialAction, undefined)
  }
})

test('all generated pages reference existing hashed scripts and styles', async () => {
  for (const filename of ['index.html', 'choix.html', 'suggestion.html', 'favoris.html', '404.html']) {
    const html = await read(filename)
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"<>]+)"/g)].map((match) => match[1])
    assert.ok(assets.some((path) => path.endsWith('.js')))
    assert.ok(assets.some((path) => path.endsWith('.css')))
    for (const path of assets) await access(new URL(`../dist${path}`, import.meta.url))
  }
})


test('search favicon is a square PNG linked from the homepage', async () => {
  const html = await read('index.html')
  assert.match(html, /rel="icon" type="image\/png" sizes="96x96" href="\/favicon.png"/)
  const png = await readFile(new URL('../dist/favicon.png', import.meta.url))
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(png.readUInt32BE(16), 96)
  assert.equal(png.readUInt32BE(20), 96)
})
