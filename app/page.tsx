import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProductCarousel } from "@/components/product-carousel"
import { CatalogSection } from "@/components/catalog-section"
import { FeaturesSection } from "@/components/features-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"
import { getAllSiteData } from "@/lib/site-data"
import { buildTypoMap } from "@/lib/typography"

export const revalidate = 300

export default async function HomePage() {
  const data = await getAllSiteData()
  const typography = buildTypoMap(data.typography)

  return (
    <>
      <Header brand={data.settings.site_name} navItems={data.nav} />
      <main id="main-content">
        <HeroSection hero={data.hero} typography={typography} />
        <ProductCarousel products={data.products} typography={typography} />
        <CatalogSection categories={data.categories} typography={typography} />
        <FeaturesSection features={data.features} typography={typography} />
        <ContactSection contact={data.contact} typography={typography} />
      </main>
      <Footer
        config={data.footer}
        socials={data.socials}
        contact={data.contact}
        typography={typography}
      />
    </>
  )
}
