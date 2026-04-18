import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductGallery } from "@/components/product-gallery"
import {
  getAllCategories,
  getAllProducts,
  getContactInfo,
  getFooterConfig,
  getNavItems,
  getProductBySlug,
  getProductPageSettings,
  getSiteSettings,
  getSocialLinks,
  getTypography,
} from "@/lib/site-data"
import { buildTypoMap, typoStyle } from "@/lib/typography"
import type { ProductWithImages } from "@/lib/supabase"

export const revalidate = 300

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80"

function formatPrice(product: ProductWithImages | null): string {
  if (!product) return ""
  if (product.price_display && product.price_display.trim().length > 0) {
    return product.price_display
  }
  if (product.price_amount != null && product.price_amount > 0) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: product.price_currency || "RUB",
      maximumFractionDigits: 0,
    }).format(product.price_amount)
  }
  return product.price ?? ""
}

function primaryImage(product: ProductWithImages): string {
  return product.images?.[0]?.url || product.image_url || PLACEHOLDER_IMAGE
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  const settings = await getSiteSettings()
  if (!product) {
    return { title: "Товар не найден" }
  }
  const canonical = `${settings.canonical_url}/catalog/${product.slug}`
  return {
    title: product.title,
    description: product.description ?? `${product.title} в ${settings.site_name}`,
    alternates: { canonical },
    openGraph: {
      title: product.title,
      description: product.description ?? undefined,
      url: canonical,
      images: product.images?.[0]?.url
        ? [{ url: product.images[0].url, width: 1200, height: 1500, alt: product.title }]
        : undefined,
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [
    settings,
    nav,
    categories,
    contact,
    footer,
    socials,
    typography,
    pageSettings,
    allProducts,
  ] = await Promise.all([
    getSiteSettings(),
    getNavItems(),
    getAllCategories(),
    getContactInfo(),
    getFooterConfig(),
    getSocialLinks(),
    getTypography(),
    getProductPageSettings(),
    getAllProducts(),
  ])

  const typoMap = buildTypoMap(typography)
  const titleStyle = typoStyle(typoMap, 'product_page', 'title')
  const priceStyle = typoStyle(typoMap, 'product_page', 'price')
  const descStyle = typoStyle(typoMap, 'product_page', 'description')
  const metaStyle = typoStyle(typoMap, 'product_page', 'meta')
  const cardTitleStyle = typoStyle(typoMap, 'catalog_page', 'card_title')
  const cardPriceStyle = typoStyle(typoMap, 'catalog_page', 'card_price')

  const category = product.category_id
    ? categories.find((c) => c.id === product.category_id)
    : null

  const similar = pageSettings.show_similar_products
    ? allProducts
        .filter(
          (p) =>
            p.id !== product.id &&
            (category ? p.category_id === product.category_id : true),
        )
        .slice(0, pageSettings.similar_products_limit)
    : []

  return (
    <>
      <Header brand={settings.site_name} navItems={nav} />
      <main id="main-content" className="pt-24 sm:pt-28 pb-16 bg-background min-h-screen">
        <div className="container mx-auto px-4 sm:px-6">
          {pageSettings.show_breadcrumbs && (
            <nav
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-6 flex-wrap"
              aria-label="Хлебные крошки"
            >
              <Link href="/" className="hover:text-primary transition-colors">
                Главная
              </Link>
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
              <Link href="/catalog" className="hover:text-primary transition-colors">
                Каталог
              </Link>
              {category ? (
                <>
                  <ChevronRight className="w-3 h-3" aria-hidden="true" />
                  <Link
                    href={`/catalog?category=${encodeURIComponent(category.slug)}`}
                    className="hover:text-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                </>
              ) : null}
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
              <span className="text-foreground truncate">{product.title}</span>
            </nav>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">
            <ProductGallery
              images={product.images}
              fallback={product.image_url ?? undefined}
              alt={product.title}
            />

            <div className="space-y-5">
              {product.badge ? (
                <span className="inline-block px-3 py-1 bg-secondary text-secondary-foreground text-[11px] font-bold uppercase tracking-wider rounded-full">
                  {product.badge}
                </span>
              ) : null}
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl" style={titleStyle}>
                {product.title}
              </h1>
              <div
                className="font-heading text-2xl sm:text-3xl text-primary font-semibold"
                style={priceStyle}
              >
                {formatPrice(product)}
              </div>
              {pageSettings.show_category_meta && category ? (
                <p className="text-sm text-muted-foreground" style={metaStyle}>
                  Категория:{' '}
                  <Link
                    href={`/catalog?category=${encodeURIComponent(category.slug)}`}
                    className="text-primary hover:underline"
                  >
                    {category.name}
                  </Link>
                </p>
              ) : null}
              {product.description ? (
                <p
                  className="text-base leading-relaxed text-foreground/90 whitespace-pre-line"
                  style={descStyle}
                >
                  {product.description}
                </p>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href={pageSettings.cta_primary_link}
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium uppercase tracking-wide text-xs hover:bg-transparent hover:text-primary border-2 border-primary transition-all duration-300"
                >
                  {pageSettings.cta_primary_text}
                </Link>
                {pageSettings.show_phone_cta && contact.phone_primary ? (
                  <a
                    href={`tel:${contact.phone_primary.replace(/[^\d+]/g, '')}`}
                    className="inline-flex items-center justify-center px-6 py-3 border-2 border-border rounded-full font-medium uppercase tracking-wide text-xs hover:bg-accent transition-all duration-300"
                  >
                    {contact.phone_primary}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {similar.length > 0 && (
            <section className="mt-16 sm:mt-20">
              <h2 className="font-heading text-2xl sm:text-3xl mb-6">
                {pageSettings.similar_products_heading}
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {similar.map((item) => (
                  <Link
                    key={item.id}
                    href={item.slug ? `/catalog/${item.slug}` : '#'}
                    className="group block bg-card border border-border/60 rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <Image
                        src={primaryImage(item)}
                        alt={item.title}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4 space-y-1">
                      <h3 className="font-heading text-base" style={cardTitleStyle}>
                        {item.title}
                      </h3>
                      <p className="text-primary font-semibold text-sm" style={cardPriceStyle}>
                        {formatPrice(item)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
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
