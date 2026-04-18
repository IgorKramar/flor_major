"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { ProductImage } from "@/lib/supabase"

interface ProductGalleryProps {
  images: ProductImage[]
  fallback?: string
  alt: string
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&q=80"

export function ProductGallery({ images, fallback, alt }: ProductGalleryProps) {
  const list = images.length > 0
    ? images
    : fallback
      ? [{ id: -1, url: fallback, alt: null, is_primary: true, sort_order: 0, product_id: -1, created_at: '', updated_at: '' } as ProductImage]
      : [{ id: -1, url: PLACEHOLDER_IMAGE, alt: null, is_primary: true, sort_order: 0, product_id: -1, created_at: '', updated_at: '' } as ProductImage]

  const [activeIndex, setActiveIndex] = useState(0)
  const active = list[Math.min(activeIndex, list.length - 1)]

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-card border border-border/60">
        <Image
          src={active.url}
          alt={active.alt ?? alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {list.length > 1 ? (
        <div
          className="grid grid-cols-4 sm:grid-cols-5 gap-2"
          role="tablist"
          aria-label="Дополнительные фотографии"
        >
          {list.map((image, idx) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={idx === activeIndex}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border transition-colors",
                idx === activeIndex
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border/60 hover:border-primary/40",
              )}
            >
              <Image
                src={image.url}
                alt={image.alt ?? alt}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
