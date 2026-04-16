"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Product {
  id: number
  title: string
  price: string
  description: string
  image: string
  badge?: string
}

const defaultProducts: Product[] = [
  {
    id: 1,
    title: "Нежность утра",
    price: "3 500 ₽",
    description: "Изысканный букет из роз и эустомы с нежной зеленью",
    image: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80",
    badge: "Хит",
  },
  {
    id: 2,
    title: "Страсть кармин",
    price: "4 200 ₽",
    description: "25 алых эквадорских роз премиум-класса",
    image: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600&q=80",
  },
  {
    id: 3,
    title: "Весенний сад",
    price: "2 900 ₽",
    description: "Яркий микс из сезонных цветов и полевых трав",
    image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&q=80",
    badge: "Новинка",
  },
  {
    id: 4,
    title: "Розовый закат",
    price: "3 800 ₽",
    description: "Нежные пионовидные розы в авторской упаковке",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&q=80",
  },
  {
    id: 5,
    title: "Белоснежная элегантность",
    price: "5 500 ₽",
    description: "Классический букет из белых роз и орхидей",
    image: "https://images.unsplash.com/photo-1561577071-c81c91d18ac5?w=600&q=80",
    badge: "Премиум",
  },
]

interface ProductCarouselProps {
  products?: Product[]
}

export function ProductCarousel({ products = defaultProducts }: ProductCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoplayRef = useRef<NodeJS.Timeout>()

  const totalSlides = products.length

  const resetAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current)
    }
    autoplayRef.current = setInterval(() => {
      if (!document.hidden && !isDragging) {
        setCurrentSlide((prev) => (prev + 1) % totalSlides)
      }
    }, 5000)
  }, [totalSlides, isDragging])

  useEffect(() => {
    resetAutoplay()
    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current)
      }
    }
  }, [resetAutoplay])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    const section = document.getElementById("bouquets")
    if (section) {
      observer.observe(section)
    }

    return () => observer.disconnect()
  }, [])

  const goToSlide = (index: number) => {
    setCurrentSlide(((index % totalSlides) + totalSlides) % totalSlides)
    resetAutoplay()
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides)
    resetAutoplay()
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
    resetAutoplay()
  }

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ("button" in e && e.button !== 0) return
    setIsDragging(true)
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    setStartX(clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    const clientX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX
    const diff = clientX - startX
    if (Math.abs(diff) > 50) {
      diff > 0 ? prevSlide() : nextSlide()
    }
  }

  return (
    <section id="bouquets" className="py-20 sm:py-24 md:py-28 lg:py-32 bg-card" aria-labelledby="bouquets-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div
          className={cn(
            "text-center mb-12 sm:mb-16 md:mb-20 transition-all duration-700 ease-out",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <h2 id="bouquets-heading" className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3">
            Наши букеты
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">Созданы с любовью и вниманием к деталям</p>
        </div>

        {/* Carousel Container */}
        <div
          ref={containerRef}
          className="relative max-w-5xl mx-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={() => setIsDragging(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") prevSlide()
            if (e.key === "ArrowRight") nextSlide()
          }}
          tabIndex={0}
          role="region"
          aria-label="Карусель букетов"
          aria-roledescription="карусель"
        >
          {/* Track */}
          <div className="overflow-hidden rounded-2xl" aria-live="polite">
            <div
              className="flex transition-transform duration-700 ease-out will-change-transform"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {products.map((product, idx) => (
                <article
                  key={product.id}
                  className="carousel-slide w-full flex-shrink-0"
                  aria-hidden={idx !== currentSlide}
                  role="tabpanel"
                  aria-label={`Слайд ${idx + 1} из ${totalSlides}: ${product.title}`}
                >
                  <div className="px-3 sm:px-4">
                    <div className="bg-background rounded-xl overflow-hidden transition-all duration-400 ease-out h-full">
                      <div className="relative h-64 sm:h-72 md:h-96 overflow-hidden">
                        {product.badge && (
                          <span className="absolute top-3 sm:top-4 left-3 sm:left-4 px-3 sm:px-4 py-1 sm:py-1.5 bg-secondary text-secondary-foreground text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-full z-10">
                            {product.badge}
                          </span>
                        )}
                        <Image
                          src={product.image}
                          alt={`${product.title} — ${product.description}`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                          className="object-cover transition-transform duration-700 ease-out hover:scale-105 select-none"
                          draggable={false}
                          loading={idx === 0 ? "eager" : "lazy"}
                        />
                      </div>
                      <div className="p-4 sm:p-6 md:p-8 text-center space-y-2 sm:space-y-3">
                        <h3 className="font-heading text-xl sm:text-2xl md:text-3xl">{product.title}</h3>
                        <div className="font-heading text-lg sm:text-xl md:text-2xl text-primary font-semibold">
                          {product.price}
                        </div>
                        <p className="text-muted-foreground text-xs sm:text-sm md:text-base">{product.description}</p>
                        <Link
                          href="#contact"
                          className="inline-flex items-center justify-center px-5 sm:px-6 py-2 sm:py-2.5 bg-primary text-primary-foreground rounded-full font-medium uppercase tracking-wide text-[10px] sm:text-xs mt-2 hover:bg-transparent hover:text-primary border-2 border-primary transition-all duration-300"
                        >
                          Заказать
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            aria-label="Предыдущий слайд"
            className="absolute left-1 sm:left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 flex items-center justify-center z-10"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Следующий слайд"
            className="absolute right-1 sm:right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 flex items-center justify-center z-10"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 mt-4 sm:mt-6" role="tablist" aria-label="Навигация по слайдам">
            {products.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                aria-label={`Перейти к слайду ${idx + 1}`}
                aria-selected={idx === currentSlide}
                role="tab"
                className={cn(
                  "h-2 rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  idx === currentSlide ? "w-7 bg-primary" : "w-2 bg-muted hover:bg-primary/70"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
