export const siteConfig = {
  name: "Флор Мажор",
  description: "Магазин цветов в Омске — свежие букеты, авторские композиции и доставка",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://flormajor-omsk.ru",
  ogImage: "https://flormajor-omsk.ru/og-image.jpg",
  links: {
    twitter: "https://twitter.com/flormajor",
    github: "https://github.com/flormajor",
  },
  contacts: {
    phone: "+7 (933) 303-39-42",
    phoneSecondary: "+7 (913) 975-76-12",
    email: "info@flormajor.ru",
    address: "г. Омск, ул. Карла Маркса, 50",
  },
}

export type SiteConfig = typeof siteConfig
