import Image from "next/image"
import Link from "next/link"
import type { HeroSettings } from "@/lib/supabase"
import { typoStyle, type TypoMap } from "@/lib/typography"

interface HeroSectionProps {
  hero: HeroSettings | null
  typography?: TypoMap
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1563241527-3004b7be0fee?w=1200&q=80"

export function HeroSection({ hero, typography }: HeroSectionProps) {
  const title = hero?.title || "Цветы, которые говорят о чувствах"
  const subtitle =
    hero?.subtitle ||
    "Свежие букеты и авторские композиции в Омске. Доставка круглосуточно."
  const ctaText = hero?.cta_text || "Выбрать букет"
  const ctaLink = hero?.cta_link || "#products"
  const secondaryCtaText = hero?.secondary_cta_text || "Связаться с нами"
  const secondaryCtaLink = hero?.secondary_cta_link || "#contact"
  const image = hero?.background_image || FALLBACK_IMAGE
  const alt = hero?.alt_text || "Букет цветов ФЛОРМАЖОР — свежие цветы в Омске"

  const titleStyle = typoStyle(typography, 'hero', 'title')
  const accentStyle = typoStyle(typography, 'hero', 'accent')
  const subtitleStyle = typoStyle(typography, 'hero', 'subtitle')
  const ctaStyle = typoStyle(typography, 'hero', 'cta')
  const secondaryCtaStyle = typoStyle(typography, 'hero', 'secondary_cta')

  return (
    <section
      id="home"
      className="min-h-screen flex items-center pt-20 sm:pt-24 md:pt-28 pb-12 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(120deg, var(--background) 40%, var(--accent) 100%)",
      }}
      aria-labelledby="hero-heading"
    >
      <div
        className="absolute -top-20 -right-10 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--primary) 15%, transparent) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          <div className="space-y-4 sm:space-y-6 md:space-y-8 text-center md:text-left">
            <h1
              id="hero-heading"
              className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl italic leading-tight text-balance"
              style={titleStyle}
            >
              {title}
            </h1>
            {hero?.headline_accent && (
              <p
                className="font-heading italic text-xl sm:text-2xl md:text-3xl text-primary"
                style={accentStyle}
              >
                {hero.headline_accent}
              </p>
            )}
            <p
              className="text-muted-foreground text-base sm:text-lg md:text-xl font-light leading-relaxed max-w-lg mx-auto md:mx-0"
              style={subtitleStyle}
            >
              {subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 justify-center md:justify-start">
              <Link
                href={ctaLink}
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 bg-primary text-primary-foreground rounded-full font-medium uppercase tracking-wide text-xs hover:bg-transparent hover:text-primary border-2 border-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30"
                style={ctaStyle}
              >
                {ctaText}
              </Link>
              {secondaryCtaText && (
                <Link
                  href={secondaryCtaLink}
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 bg-transparent text-foreground rounded-full font-medium uppercase tracking-wide text-xs border-2 border-border hover:bg-accent transition-all duration-300 hover:-translate-y-0.5"
                  style={secondaryCtaStyle}
                >
                  {secondaryCtaText}
                </Link>
              )}
            </div>
          </div>

          <div className="relative order-first md:order-last mx-auto w-full max-w-sm sm:max-w-md md:max-w-none">
            <Image
              src={image}
              alt={alt}
              width={800}
              height={1000}
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl shadow-black/12 aspect-[4/5] object-cover w-full max-w-sm sm:max-w-md md:max-w-full mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
