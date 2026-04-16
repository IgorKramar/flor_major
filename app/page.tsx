import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProductCarousel } from "@/components/product-carousel"
import { CatalogSection } from "@/components/catalog-section"
import { FeaturesSection } from "@/components/features-section"
import { ContactSection } from "@/components/contact-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main-content">
        <HeroSection />
        <ProductCarousel />
        <CatalogSection />
        <FeaturesSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
