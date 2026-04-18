import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CatalogBrowser } from "@/components/catalog-browser"
import {
  getAllCategories,
  getAllProducts,
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
  searchParams: Promise<{ category?: string; q?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: "Каталог товаров",
    description: `Все товары ${settings.site_name}: букеты, композиции, цветы в горшках и подарки.`,
    alternates: { canonical: `${settings.canonical_url}/catalog` },
  }
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { category, q } = await searchParams
  const [settings, nav, products, categories, contact, footer, socials, typography] =
    await Promise.all([
      getSiteSettings(),
      getNavItems(),
      getAllProducts(),
      getAllCategories(),
      getContactInfo(),
      getFooterConfig(),
      getSocialLinks(),
      getTypography(),
    ])

  const typoMap = buildTypoMap(typography)
  const headingStyle = typoStyle(typoMap, 'catalog_page', 'heading')
  const subheadingStyle = typoStyle(typoMap, 'catalog_page', 'subheading')

  return (
    <>
      <Header brand={settings.site_name} navItems={nav} />
      <main id="main-content" className="pt-24 sm:pt-28 pb-16 bg-background min-h-screen">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-8 sm:mb-10">
            <h1
              className="font-heading text-3xl sm:text-4xl md:text-5xl mb-2"
              style={headingStyle}
            >
              Каталог товаров
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg" style={subheadingStyle}>
              Все наши композиции в одном месте
            </p>
          </div>

          <CatalogBrowser
            products={products}
            categories={categories}
            initialCategory={category}
            initialQuery={q ?? ''}
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
