import type { MetadataRoute } from "next"
import {
  getAllProducts,
  getNavItems,
  getSiteSettings,
} from "@/lib/site-data"

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, nav, products] = await Promise.all([
    getSiteSettings(),
    getNavItems(),
    getAllProducts(),
  ])
  const baseUrl = (settings.canonical_url || "https://flormajor-omsk.ru").replace(/\/$/, "")
  const now = new Date()

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ]

  for (const item of nav) {
    if (item.href.startsWith('http')) {
      entries.push({
        url: item.href,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      })
      continue
    }
    if (item.href.startsWith('/')) {
      entries.push({
        url: `${baseUrl}${item.href}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
  }

  for (const product of products) {
    if (!product.slug) continue
    entries.push({
      url: `${baseUrl}/catalog/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }

  return entries
}
