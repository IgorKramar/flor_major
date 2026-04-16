import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Montserrat } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const cormorant = Cormorant_Garamond({
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
})

const montserrat = Montserrat({
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://flormajor-omsk.ru"),
  title: {
    default: "ФЛОРМАЖОР — Магазин цветов в Омске | Букеты, композиции, доставка",
    template: "%s | ФЛОРМАЖОР Омск",
  },
  description:
    "Свежие букеты и цветочные композиции в Омске. ФЛОРМАЖОР: ул. Карла Маркса, 50. Круглосуточно. Доставка по городу. Розы, хризантемы, авторские букеты на заказ.",
  keywords: [
    "цветы омск",
    "доставка цветов омск",
    "букеты омск",
    "роза эквадор омск",
    "роза кения омск",
    "цветочный магазин омск",
    "флор мажор",
    "горшечные растения омск",
    "шарики омск",
    "сувениры омск",
    "хризантема омск",
    "букет на заказ",
    "купить цветы омск",
    "свадебный букет омск",
    "цветы на день рождения омск",
  ],
  authors: [{ name: "ФЛОРМАЖОР" }],
  creator: "ФЛОРМАЖОР",
  publisher: "ФЛОРМАЖОР",
  robots: {
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
    url: "https://flormajor-omsk.ru/",
    siteName: "ФЛОРМАЖОР",
    title: "ФЛОРМАЖОР — Цветы с душой в Омске",
    description: "Свежие букеты, авторские композиции и подарки. Доставка по Омску круглосуточно.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ФЛОРМАЖОР — Магазин цветов в Омске",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ФЛОРМАЖОР — Магазин цветов в Омске",
    description: "Свежие букеты и цветочные композиции в Омске",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://flormajor-omsk.ru/",
  },
  category: "Цветочный магазин",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#c89f9f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" dir="ltr" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Florist",
              name: "ФЛОРМАЖОР",
              image: "https://flormajor-omsk.ru/og-image.jpg",
              url: "https://flormajor-omsk.ru/",
              telephone: "+7 (933) 303-39-42",
              priceRange: "₽₽",
              address: {
                "@type": "PostalAddress",
                streetAddress: "ул. Карла Маркса, 50",
                addressLocality: "Омск",
                addressRegion: "Омская область",
                postalCode: "644000",
                addressCountry: "RU",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 54.9833,
                longitude: 73.3675,
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                  opens: "00:00",
                  closes: "23:59",
                },
              ],
              sameAs: ["https://vk.com/flormajor", "https://t.me/flormajor", "https://wa.me/79333033942"],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "128",
              },
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Букеты и цветочные композиции",
                itemListElement: [
                  {
                    "@type": "OfferCatalog",
                    name: "Букеты роз",
                  },
                  {
                    "@type": "OfferCatalog",
                    name: "Авторские композиции",
                  },
                  {
                    "@type": "OfferCatalog",
                    name: "Горшечные растения",
                  },
                ],
              },
            }),
          }}
        />
      </head>
      <body className={`${cormorant.variable} ${montserrat.variable} font-body antialiased bg-background text-foreground`}>
        <a href="#main-content" className="skip-link sr-only focus:not-sr-only">
          Перейти к основному содержимому
        </a>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
