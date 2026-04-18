import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductGallery } from "@/components/product-gallery"
import {
  getAllCategories,
  getContactInfo,
  getFooterConfig,
  getNavItems,
  getProductBySlug,
  getSiteSettings,
  getSocialLinks,
  getTypography,
} from "@/lib/site-data"
import { buildTypoMap, typoStyle } from "@/lib/typography"

export const revalidate = 300

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

function formatPrice(product: Awaited<ReturnType<typeof getProductBySlug>>): string {
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

  const [settings, nav, categories, contact, footer, socials, typography] =
    await Promise.all([
      getSiteSettings(),
      getNavItems(),
      getAllCategories(),
      getContactInfo(),
      getFooterConfig(),
      getSocialLinks(),
      getTypography(),
    ])

  const typoMap = buildTypoMap(typography)
  const titleStyle = typoStyle(typoMap, 'product_page', 'title')
  const priceStyle = typoStyle(typoMap, 'product_page', 'price')
  const descStyle = typoStyle(typoMap, 'product_page', 'description')
  const metaStyle = typoStyle(typoMap, 'product_page', 'meta')

  const category = product.category_id
    ? categories.find((c) => c.id === product.category_id)
    : null

  return (
    <>
      <Header brand={settings.site_name} navItems={nav} />
      <main id="main-content" className="pt-24 sm:pt-28 pb-16 bg-background min-h-screen">
        <div className="container mx-auto px-4 sm:px-6">
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
              {category ? (
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
                  href="/#contact"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium uppercase tracking-wide text-xs hover:bg-transparent hover:text-primary border-2 border-primary transition-all duration-300"
                >
                  Заказать
                </Link>
                {contact.phone_primary ? (
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
