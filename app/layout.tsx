import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Montserrat } from "next/font/google"
import "./globals.css"
import {
  getContactInfo,
  getSiteSettings,
  getThemeSettings,
  getTypography,
} from "@/lib/site-data"
import type { TypographyRow } from "@/lib/supabase"

export const revalidate = 300

const cormorant = Cormorant_Garamond({
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
})

const montserrat = Montserrat({
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
})

export async function generateMetadata(): Promise<Metadata> {
  const [settings, contact] = await Promise.all([getSiteSettings(), getContactInfo()])
  const canonical = settings.canonical_url || "https://flormajor-omsk.ru"
  const ogImage = settings.og_image_url || "/og-image.jpg"

  return {
    metadataBase: new URL(canonical),
    title: {
      default: `${settings.site_name} — Магазин цветов в Омске`,
      template: `%s | ${settings.site_name}`,
    },
    description: settings.site_description || "",
    keywords: settings.meta_keywords,
    authors: [{ name: settings.site_name }],
    creator: settings.site_name,
    publisher: settings.site_name,
    robots: settings.maintenance_mode
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: `${canonical}/`,
      siteName: settings.site_name,
      title: `${settings.site_name} — Цветы с душой в Омске`,
      description: settings.site_description || "",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${settings.site_name} — Магазин цветов в Омске`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${settings.site_name} — Магазин цветов в Омске`,
      description: settings.site_description || "",
      images: [ogImage],
    },
    alternates: { canonical: `${canonical}/` },
    category: "Цветочный магазин",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
    other: {
      "contact:phone": contact.phone_primary,
    },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings()
  return {
    themeColor: settings.theme_color || "#c89f9f",
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  }
}

function buildJsonLd(
  settings: Awaited<ReturnType<typeof getSiteSettings>>,
  contact: Awaited<ReturnType<typeof getContactInfo>>
) {
  if (settings.json_ld_override && typeof settings.json_ld_override === "object") {
    return settings.json_ld_override
  }

  const canonical = settings.canonical_url || "https://flormajor-omsk.ru"
  const ogImage = settings.og_image_url
    ? `${canonical}${settings.og_image_url.startsWith("http") ? "" : settings.og_image_url}`
    : `${canonical}/og-image.jpg`

  return {
    "@context": "https://schema.org",
    "@type": "Florist",
    name: settings.site_name,
    image: ogImage,
    url: `${canonical}/`,
    telephone: contact.phone_primary,
    priceRange: "₽₽",
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address,
      addressLocality: contact.address_locality ?? undefined,
      addressRegion: contact.address_region ?? undefined,
      postalCode: contact.postal_code ?? undefined,
      addressCountry: contact.address_country ?? "RU",
    },
    geo:
      contact.geo_lat != null && contact.geo_lng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: contact.geo_lat,
            longitude: contact.geo_lng,
          }
        : undefined,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "00:00",
        closes: "23:59",
      },
    ],
    aggregateRating:
      settings.rating_value != null && settings.review_count != null
        ? {
            "@type": "AggregateRating",
            ratingValue: String(settings.rating_value),
            reviewCount: String(settings.review_count),
          }
        : undefined,
  }
}

const STATIC_FONT_FAMILIES = new Set<string>([
  'Cormorant Garamond',
  'Montserrat',
])

function buildGoogleFontsHref(typography: TypographyRow[]): string | null {
  const byFamily = new Map<string, Set<string>>()
  for (const row of typography) {
    const family = row.font_family?.trim()
    if (!family) continue
    if (STATIC_FONT_FAMILIES.has(family)) continue
    const weights = byFamily.get(family) ?? new Set<string>()
    const weight = (row.font_weight ?? '400').trim() || '400'
    weights.add(weight)
    byFamily.set(family, weights)
  }
  if (byFamily.size === 0) return null

  const families: string[] = []
  for (const [family, weights] of byFamily.entries()) {
    const sorted = Array.from(weights).sort((a, b) => Number(a) - Number(b))
    const wParam = sorted.length > 0 ? `:wght@${sorted.join(';')}` : ''
    families.push(`family=${encodeURIComponent(family).replace(/%20/g, '+')}${wParam}`)
  }
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

function themeCss(theme: Awaited<ReturnType<typeof getThemeSettings>>) {
  const custom = theme.custom_css ?? ""
  return `
    :root {
      --primary: ${theme.primary_color};
      --primary-foreground: #ffffff;
      --primary-dark: ${theme.primary_dark};
      --accent: ${theme.accent_color};
      --accent-foreground: ${theme.foreground_color};
      --background: ${theme.background_color};
      --foreground: ${theme.foreground_color};
      --radius: ${theme.border_radius};
    }
    ${custom}
  `
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, contact, theme, typography] = await Promise.all([
    getSiteSettings(),
    getContactInfo(),
    getThemeSettings(),
    getTypography(),
  ])

  const jsonLd = buildJsonLd(settings, contact)
  const googleFontsHref = buildGoogleFontsHref(typography)

  return (
    <html lang="ru" dir="ltr" className="scroll-smooth">
      <head>
        <style
          dangerouslySetInnerHTML={{ __html: themeCss(theme) }}
        />
        {googleFontsHref ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={googleFontsHref} />
          </>
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${cormorant.variable} ${montserrat.variable} font-body antialiased bg-background text-foreground`}
      >
        <a href="#main-content" className="skip-link sr-only focus:not-sr-only">
          Перейти к основному содержимому
        </a>
        {children}
      </body>
    </html>
  )
}
