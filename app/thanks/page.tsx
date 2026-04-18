import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  getContactInfo,
  getFooterConfig,
  getNavItems,
  getSiteSettings,
  getSocialLinks,
  getThanksPageSettings,
  getTypography,
} from "@/lib/site-data"
import { buildTypoMap, typoStyle } from "@/lib/typography"

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([
    getSiteSettings(),
    getThanksPageSettings(),
  ])
  return {
    title: page.heading,
    description: page.subheading || `Спасибо от ${settings.site_name}`,
    alternates: { canonical: `${settings.canonical_url}/thanks` },
    robots: { index: false, follow: false },
  }
}

export default async function ThanksPage() {
  const [settings, nav, contact, footer, socials, typography, page] =
    await Promise.all([
      getSiteSettings(),
      getNavItems(),
      getContactInfo(),
      getFooterConfig(),
      getSocialLinks(),
      getTypography(),
      getThanksPageSettings(),
    ])

  if (!page.is_active) notFound()

  const typoMap = buildTypoMap(typography)
  const headingStyle = typoStyle(typoMap, 'thanks_page', 'heading')
  const subheadingStyle = typoStyle(typoMap, 'thanks_page', 'subheading')
  const bodyStyle = typoStyle(typoMap, 'thanks_page', 'body')
  const phoneStyle = typoStyle(typoMap, 'thanks_page', 'phone')
  const buttonStyle = typoStyle(typoMap, 'thanks_page', 'button')

  return (
    <>
      <Header brand={settings.site_name} navItems={nav} />
      <main
        id="main-content"
        className="pt-24 sm:pt-28 pb-16 bg-background min-h-screen"
      >
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-10 md:p-14 text-center space-y-6 shadow-sm">
            {page.image_url ? (
              <div className="relative mx-auto w-40 h-40 sm:w-56 sm:h-56 rounded-2xl overflow-hidden">
                <Image
                  src={page.image_url}
                  alt={page.image_alt || page.heading}
                  fill
                  sizes="(max-width: 640px) 10rem, 14rem"
                  className="object-cover"
                  priority
                />
              </div>
            ) : null}

            <h1
              className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground"
              style={headingStyle}
            >
              {page.heading}
            </h1>

            {page.subheading ? (
              <p className="text-muted-foreground text-base sm:text-lg" style={subheadingStyle}>
                {page.subheading}
              </p>
            ) : null}

            {page.body_text ? (
              <p
                className="text-foreground/85 text-base leading-relaxed whitespace-pre-line max-w-xl mx-auto"
                style={bodyStyle}
              >
                {page.body_text}
              </p>
            ) : null}

            {page.show_phone && contact.phone_primary ? (
              <a
                href={`tel:${contact.phone_primary.replace(/[^\d+]/g, '')}`}
                className="inline-flex items-center justify-center text-primary font-heading text-2xl sm:text-3xl hover:underline"
                style={phoneStyle}
              >
                {contact.phone_primary}
              </a>
            ) : null}

            <div className="pt-2">
              <Link
                href={page.button_link}
                className="inline-flex items-center justify-center px-7 py-3 bg-primary text-primary-foreground rounded-full font-medium uppercase tracking-wide text-xs hover:bg-transparent hover:text-primary border-2 border-primary transition-all duration-300"
                style={buttonStyle}
              >
                {page.button_text}
              </Link>
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
