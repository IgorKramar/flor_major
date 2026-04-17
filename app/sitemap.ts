import type { MetadataRoute } from "next"
import { getNavItems, getSiteSettings } from "@/lib/site-data"

export const revalidate = 300


export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, nav] = await Promise.all([getSiteSettings(), getNavItems()])
  const baseUrl = (settings.canonical_url || "https://flormajor-omsk.ru").replace(/\/$/, "")
  const now = new Date()

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ]

  for (const item of nav) {
    entries.push({
      url: item.href.startsWith("http") ? item.href : `${baseUrl}/${item.href.replace(/^#?\//, '#')}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }

  return entries
}
