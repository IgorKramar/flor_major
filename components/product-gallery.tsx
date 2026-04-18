"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProductImage } from "@/lib/supabase"

interface ProductGalleryProps {
  images: ProductImage[]
  fallback?: string
  alt: string
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&q=80"

const SWIPE_THRESHOLD = 40

export function ProductGallery({ images, fallback, alt }: ProductGalleryProps) {
  const list = images.length > 0
    ? images
    : fallback
      ? [{ id: -1, url: fallback, alt: null, is_primary: true, sort_order: 0, product_id: -1, created_at: '', updated_at: '' } as ProductImage]
      : [{ id: -1, url: PLACEHOLDER_IMAGE, alt: null, is_primary: true, sort_order: 0, product_id: -1, created_at: '', updated_at: '' } as ProductImage]

  const [activeIndex, setActiveIndex] = useState(0)
  const hasMany = list.length > 1
  const active = list[Math.min(activeIndex, list.length - 1)]

  const goTo = useCallback(
    (index: number) => {
      if (!hasMany) return
      const next = (index + list.length) % list.length
      setActiveIndex(next)
    },
    [hasMany, list.length],
  )

  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex])
  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex])

  const viewerRef = useRef<HTMLDivElement>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchDeltaRef = useRef(0)

  useEffect(() => {
    if (!hasMany) return
    const handleKey = (event: KeyboardEvent) => {
      if (document.activeElement && viewerRef.current?.contains(document.activeElement)) {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          prev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          next()
        }
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [hasMany, prev, next])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMany) return
    touchStartXRef.current = event.touches[0]?.clientX ?? null
    touchDeltaRef.current = 0
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null) return
    const current = event.touches[0]?.clientX ?? touchStartXRef.current
    touchDeltaRef.current = current - touchStartXRef.current
  }

  const handleTouchEnd = () => {
    if (touchStartXRef.current == null) return
    const delta = touchDeltaRef.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta > 0) prev()
      else next()
    }
    touchStartXRef.current = null
    touchDeltaRef.current = 0
  }

  return (
    <div className="space-y-4">
      <div
        ref={viewerRef}
        tabIndex={hasMany ? 0 : -1}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-card border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-roledescription={hasMany ? "carousel" : undefined}
        aria-label={hasMany ? "Галерея фотографий товара" : undefined}
      >
        <Image
          src={active.url}
          alt={active.alt ?? alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover select-none"
          draggable={false}
        />

        {hasMany && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white backdrop-blur-sm shadow-md flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Предыдущая фотография"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white backdrop-blur-sm shadow-md flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Следующая фотография"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>

            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5"
              aria-hidden="true"
            >
              {list.map((image, idx) => (
                <span
                  key={image.id}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    idx === activeIndex ? "bg-white w-4" : "bg-white/60",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {hasMany && (
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
                "relative aspect-square rounded-lg overflow-hidden border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
      )}
    </div>
  )
}
