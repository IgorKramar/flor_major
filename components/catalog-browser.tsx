"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search } from "lucide-react"
import { getRenderUrl } from "@/lib/image-url"
import type {
  CatalogPageSettings,
  Category,
  ProductWithImages,
} from "@/lib/supabase"
import type { TypoMap } from "@/lib/typography"
import { typoStyle } from "@/lib/typography"

type SortMode = "default" | "price_asc" | "price_desc"

const VALID_SORTS: SortMode[] = ["default", "price_asc", "price_desc"]

interface CatalogBrowserProps {
  products: ProductWithImages[]
  categories: Category[]
  settings: CatalogPageSettings
  initialCategory?: string
  initialQuery?: string
  initialSort?: string
  typography?: TypoMap
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80"

function formatPrice(product: ProductWithImages): string {
  if (product.price_display && product.price_display.trim().length > 0) {
    return product.price_display
  }
  if (product.price_amount != null && product.price_amount > 0) {
    const currency = product.price_currency || "RUB"
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(product.price_amount)
  }
  return product.price ?? ""
}

function primaryImage(product: ProductWithImages): string {
  return product.images?.[0]?.url || product.image_url || PLACEHOLDER_IMAGE
}

function normalize(str: string | null | undefined): string {
  return (str ?? "").toLowerCase()
}

function productSortPrice(product: ProductWithImages): number | null {
  return product.price_amount != null && product.price_amount > 0
    ? product.price_amount
    : null
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const lower = text.toLowerCase()
  const needle = query.toLowerCase()
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let idx = lower.indexOf(needle)
  let key = 0
  while (idx !== -1) {
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx))
    parts.push(
      <mark
        key={`mark-${key++}`}
        className="bg-primary/20 text-primary rounded px-0.5"
      >
        {text.slice(idx, idx + needle.length)}
      </mark>,
    )
    lastIndex = idx + needle.length
    idx = lower.indexOf(needle, lastIndex)
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

export function CatalogBrowser({
  products,
  categories,
  settings,
  initialCategory,
  initialQuery = "",
  initialSort = "default",
  typography,
}: CatalogBrowserProps) {
  const [category, setCategory] = useState<string | null>(initialCategory ?? null)
  const [query, setQuery] = useState(initialQuery)
  const [sort, setSort] = useState<SortMode>(
    (VALID_SORTS as readonly string[]).includes(initialSort)
      ? (initialSort as SortMode)
      : "default",
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (category) params.set("category", category)
    else params.delete("category")
    if (query.trim()) params.set("q", query.trim())
    else params.delete("q")
    if (sort !== "default") params.set("sort", sort)
    else params.delete("sort")
    const next = params.toString()
    const url = `${window.location.pathname}${next ? `?${next}` : ""}`
    window.history.replaceState(null, "", url)
  }, [category, query, sort])

  const categoriesById = useMemo(() => {
    const map = new Map<number, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = products.filter((product) => {
      if (category) {
        const productCategory = product.category_id
          ? categoriesById.get(product.category_id)
          : null
        const slug = productCategory?.slug ?? product.category ?? null
        if (!slug) return false
        if (slug !== category) return false
      }
      if (!q) return true
      const catName = product.category_id
        ? categoriesById.get(product.category_id)?.name
        : null
      return (
        normalize(product.title).includes(q) ||
        normalize(product.description).includes(q) ||
        normalize(catName).includes(q) ||
        normalize(product.category).includes(q)
      )
    })

    if (sort === "default") return list

    return [...list].sort((a, b) => {
      const priceA = productSortPrice(a)
      const priceB = productSortPrice(b)
      if (priceA == null && priceB == null) return 0
      if (priceA == null) return 1
      if (priceB == null) return -1
      return sort === "price_asc" ? priceA - priceB : priceB - priceA
    })
  }, [products, category, query, categoriesById, sort])

  const chipStyle = typoStyle(typography, 'catalog_page', 'filter_chip')
  const cardTitleStyle = typoStyle(typography, 'catalog_page', 'card_title')
  const cardDescStyle = typoStyle(typography, 'catalog_page', 'card_description')
  const cardPriceStyle = typoStyle(typography, 'catalog_page', 'card_price')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 md:items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={settings.search_placeholder}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">{settings.sort_label}:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="default">{settings.sort_default_label}</option>
            <option value="price_asc">{settings.sort_asc_label}</option>
            <option value="price_desc">{settings.sort_desc_label}</option>
          </select>
        </label>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {settings.filter_label}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/40'
            }`}
            style={chipStyle}
          >
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.slug === category ? null : cat.slug)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                category === cat.slug
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:border-primary/40'
              }`}
              style={chipStyle}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {settings.empty_state_text}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filtered.map((product) => {
            const image = primaryImage(product)
            const cat = product.category_id
              ? categoriesById.get(product.category_id)
              : null
            const catLabel = cat?.name ?? product.category ?? null
            const href = product.slug ? `/catalog/${product.slug}` : "#"
            const q = query.trim()
            return (
              <Link
                key={product.id}
                href={href}
                className="group flex flex-col bg-card border border-border/60 rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {product.badge ? (
                    <span className="absolute top-3 left-3 px-3 py-1 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full z-10">
                      {product.badge}
                    </span>
                  ) : null}
                  <Image
                    src={getRenderUrl(image, { width: 600, quality: 80 })}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col flex-1 p-5 space-y-2">
                  {catLabel ? (
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {highlight(catLabel, q)}
                    </p>
                  ) : null}
                  <h3 className="font-heading text-xl text-foreground" style={cardTitleStyle}>
                    {highlight(product.title, q)}
                  </h3>
                  {product.description ? (
                    <p
                      className="text-sm text-muted-foreground line-clamp-2"
                      style={cardDescStyle}
                    >
                      {highlight(product.description, q)}
                    </p>
                  ) : null}
                  <div
                    className="text-primary font-semibold font-heading text-lg pt-1"
                    style={cardPriceStyle}
                  >
                    {formatPrice(product)}
                  </div>
                  <span
                    className="mt-auto inline-flex items-center justify-center pt-2 text-sm font-medium text-primary group-hover:underline"
                  >
                    {settings.cta_card_text}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        Показано {filtered.length} товаров из {products.length}
      </p>
    </div>
  )
}
