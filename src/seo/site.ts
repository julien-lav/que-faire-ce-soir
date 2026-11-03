// Public production origin used by canonical URLs, sharing metadata and the sitemap.
export const SITE_URL = 'https://quefairecesoir.app'
export const SITE_NAME = 'Que faire ce soir ?'
export const HOME_DESCRIPTION = 'Restaurants, pizzerias, cinéma, concerts et spectacles près de chez vous. Choisissez votre lieu et votre heure pour trouver une sortie ce soir.'
export const HOME_INTRO = 'Trouve une idée de sortie près de toi : restaurant, pizzeria, cinéma, concert ou spectacle. Choisis ton lieu et ton heure pour préparer ta soirée.'

export interface PageSeo {
  title: string
  description: string
  path: string | null
  index: boolean
}

export const SEO_PAGES: Record<string, PageSeo> = {
  home: { title: 'Que faire ce soir ? Idées de sorties près de chez vous', description: HOME_DESCRIPTION, path: '/', index: true },
  choose: { title: 'Choisir mes activités | Que faire ce soir ?', description: 'Choisis tes envies pour la soirée : cinéma, concert, spectacle, restaurant, pizzeria, bar, sport ou musée.', path: '/choix', index: false },
  suggestion: { title: 'Idées de sorties | Que faire ce soir ?', description: 'Consulte les sorties et les adresses correspondant à ton lieu, ton heure et tes envies.', path: '/suggestion', index: false },
  favorites: { title: 'Mes favoris | Que faire ce soir ?', description: 'Retrouve les adresses que tu as enregistrées sur cet appareil pour préparer tes prochaines sorties.', path: '/favoris', index: false },
  notFound: { title: 'Page introuvable | Que faire ce soir ?', description: 'Cette page est introuvable. Retourne à l’accueil pour trouver une idée de sortie près de toi.', path: null, index: false },
}

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export function seoHead(page: PageSeo): string {
  const url = page.path === null ? null : SITE_URL + page.path
  const meta = (key: string, value: string, property = false) =>
    `<meta data-seo ${property ? 'property' : 'name'}="${key}" content="${escape(value)}" />`
  const tags = [
    `<title data-seo>${escape(page.title)}</title>`,
    meta('description', page.description),
    meta('robots', page.index ? 'index, follow, max-image-preview:large' : 'noindex, follow'),
    meta('og:type', 'website', true), meta('og:site_name', SITE_NAME, true), meta('og:locale', 'fr_FR', true),
    meta('og:title', page.title, true), meta('og:description', page.description, true),
    meta('og:image', SITE_URL + '/social-preview.png', true),
    meta('og:image:width', '1200', true), meta('og:image:height', '630', true),
    meta('og:image:type', 'image/png', true), meta('og:image:alt', 'Que faire ce soir ? Des idées de sorties près de chez vous.', true),
    meta('twitter:card', 'summary_large_image'), meta('twitter:title', page.title),
    meta('twitter:description', page.description), meta('twitter:image', SITE_URL + '/social-preview.png'),
    meta('twitter:image:alt', 'Que faire ce soir ? Des idées de sorties près de chez vous.'),
  ]
  if (url) tags.push(`<link data-seo rel="canonical" href="${escape(url)}" />`, meta('og:url', url, true))
  if (page.index) {
    const schema = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL + '/', name: SITE_NAME, inLanguage: 'fr-FR', description: HOME_DESCRIPTION },
      { '@type': 'WebApplication', '@id': SITE_URL + '/#app', url: SITE_URL + '/', name: SITE_NAME,
        applicationCategory: 'LifestyleApplication', operatingSystem: 'Web', inLanguage: 'fr-FR',
        isAccessibleForFree: true, description: HOME_DESCRIPTION },
    ] }
    tags.push(`<script data-seo type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`)
  }
  return tags.join('\n    ')
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
}

export function sitemapXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc></url>\n</urlset>\n`
}
