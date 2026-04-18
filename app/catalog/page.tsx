import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CatalogBrowser } from "@/components/catalog-browser"
import {
  getAllCategories,
  getAllProducts,
  getCatalogPageSettings,
  getContactInfo,
  getFooterConfig,
  getNavItems,
  getSiteSettings,
  getSocialLinks,
  getTypography,
} from "@/lib/site-data"
import { buildTypoMap, typoStyle } from "@/lib/typography"

export const revalidate = 300

interface CatalogPageProps {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getCatalogPageSettings(),
  ])
  return {
    title: page.heading,
    description: page.subheading || `Все товары ${settings.site_name}.`,
    alternates: { canonical: `${settings.canonical_url}/catalog` },
  }
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { category, q, sort } = await searchParams
  const [
    settings,
    nav,
    products,
    categories,
    contact,
    footer,
    socials,
    typography,
    catalogSettings,
  ] = await Promise.all([
    getSiteSettings(),
    getNavItems(),
    getAllProducts(),
    getAllCategories(),
    getContactInfo(),
    getFooterConfig(),
    getSocialLinks(),
    getTypography(),
    getCatalogPageSettings(),
  ])

  const typoMap = buildTypoMap(typography)
  const headingStyle = typoStyle(typoMap, 'catalog_page', 'heading')
  const subheadingStyle = typoStyle(typoMap, 'catalog_page', 'subheading')

  return (
    <>
      <Header brand={settings.site_name} navItems={nav} />
      <main id="main-content" className="pt-24 sm:pt-28 pb-16 bg-background min-h-screen">
        <div className="container mx-auto px-4 sm:px-6">
          {catalogSettings.show_breadcrumbs && (
            <nav
              aria-label="Хлебные крошки"
              className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5"
            >
              <Link href="/" className="hover:text-foreground">
                Главная
              </Link>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-foreground">{catalogSettings.heading}</span>
            </nav>
          )}

          <div className="mb-8 sm:mb-10">
            <h1
              className="font-heading text-3xl sm:text-4xl md:text-5xl mb-2"
              style={headingStyle}
            >
              {catalogSettings.heading}
            </h1>
            {catalogSettings.subheading ? (
              <p
                className="text-muted-foreground text-base sm:text-lg"
                style={subheadingStyle}
              >
                {catalogSettings.subheading}
              </p>
            ) : null}
          </div>

          <CatalogBrowser
            products={products}
            categories={categories}
            settings={catalogSettings}
            initialCategory={category}
            initialQuery={q ?? ''}
            initialSort={sort ?? 'default'}
            typography={typoMap}
          />
        </div>
      </main>
      <Footer
        config={footer}
        socials={socials}
        contact={contact}
        typography={typoMap}
      />
    </>
  )
}
