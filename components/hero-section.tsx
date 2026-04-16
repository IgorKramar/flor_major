"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function HeroSection() {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section
      id="home"
      className="min-h-screen flex items-center pt-20 sm:pt-24 md:pt-28 pb-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(120deg, var(--background) 40%, var(--accent) 100%)",
      }}
      aria-labelledby="hero-heading"
    >
      {/* Decorative gradient circle */}
      <div
        className="absolute -top-20 -right-10 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(200, 159, 159, 0.15) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div
            className={cn(
              "space-y-4 sm:space-y-6 md:space-y-8 text-center md:text-left transition-all duration-700 ease-out",
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: "100ms" }}
          >
            <h1 id="hero-heading" className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl italic leading-tight text-balance">
              Цветы, которые <br className="hidden sm:block" />
              говорят о чувствах
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl font-light leading-relaxed max-w-lg mx-auto md:mx-0">
              Свежие букеты, авторские композиции и взрослые горшечные растения самовывозом и с доставкой по Омску. Создаём настроение более 10 лет.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 justify-center md:justify-start">
              <Link
                href="#bouquets"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 bg-primary text-primary-foreground rounded-full font-medium uppercase tracking-wide text-xs hover:bg-transparent hover:text-primary border-2 border-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30"
              >
                Выбрать букет
              </Link>
              <Link
                href="#contact"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 bg-transparent text-foreground rounded-full font-medium uppercase tracking-wide text-xs border-2 border-border hover:bg-accent transition-all duration-300 hover:-translate-y-0.5"
              >
                Связаться с нами
              </Link>
            </div>
          </div>

          <div
            className={cn(
              "relative order-first md:order-last mx-auto w-full max-w-sm sm:max-w-md md:max-w-none transition-all duration-700 ease-out",
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
              hovered && "scale-[1.02] rotate-0"
            )}
            style={{ transform: visible ? (hovered ? "rotate(0deg)" : "rotate(2deg)") : "rotate(2deg) translateY(24px)" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Image
              src="https://images.unsplash.com/photo-1563241527-3004b7be0fee?w=800&q=80"
              alt="Нежный букет роз и пионов от Флор Мажор — свежие цветы в Омске"
              width={800}
              height={1000}
              priority
              className="rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl shadow-black/12 aspect-[4/5] object-cover w-full max-w-sm sm:max-w-md md:max-w-full mx-auto transition-transform duration-700 ease-out"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
