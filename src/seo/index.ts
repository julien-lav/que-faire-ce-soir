import { SEO_PAGES, seoHead } from './site'

export function updatePageSeo(routeName: unknown) {
  const page = SEO_PAGES[String(routeName)] ?? SEO_PAGES.notFound!
  // The initial HTML and client navigation use the same metadata, without duplicates.
  document.head.querySelectorAll('[data-seo]').forEach((element) => element.remove())
  document.head.insertAdjacentHTML('beforeend', seoHead(page))
}
