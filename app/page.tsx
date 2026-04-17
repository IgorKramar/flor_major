import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProductCarousel } from "@/components/product-carousel"
import { CatalogSection } from "@/components/catalog-section"
import { FeaturesSection } from "@/components/features-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"
import { getAllSiteData } from "@/lib/site-data"

export const revalidate = 300

export default async function HomePage() {
  const data = await getAllSiteData()

  return (
    <>
      <Header brand={data.settings.site_name} navItems={data.nav} />
      <main id="main-content">
        <HeroSection hero={data.hero} />
        <ProductCarousel products={data.products} />
        <CatalogSection categories={data.categories} />
        <FeaturesSection features={data.features} />
        <ContactSection contact={data.contact} />
      </main>
      <Footer
        config={data.footer}
        socials={data.socials}
        contact={data.contact}
      />
    </>
  )
}
