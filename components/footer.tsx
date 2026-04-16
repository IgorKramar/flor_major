"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Instagram, MessageCircle, Send } from "lucide-react"
import { cn } from "@/lib/utils"

const socials = [
  { name: "Instagram", icon: Instagram, link: "https://instagram.com/flormajor" },
  { name: "WhatsApp", icon: MessageCircle, link: "https://wa.me/79139757612" },
  { name: "Telegram", icon: Send, link: "https://t.me/flormajor" },
]

export function Footer() {
  const [isVisible, setIsVisible] = useState(false)
  const footerRef = useRef<HTMLElement>(null)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (footerRef.current) {
      observer.observe(footerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <footer
      ref={footerRef}
      className="relative pt-16 sm:pt-20 pb-8 sm:pb-10 bg-[#1e1e1e] text-[#d0d0d0] overflow-hidden"
      role="contentinfo"
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" aria-hidden="true" />

      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        <h2
          className={cn(
            "font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white mb-3 sm:mb-4 transition-all duration-700 ease-out",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          )}
        >
          ФЛОРМАЖОР
        </h2>

        <p
          className={cn(
            "text-[#999] text-xs sm:text-sm mb-8 sm:mb-10 transition-all duration-700 ease-out delay-100",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          Цветы с душой в самом сердце Омска
        </p>

        <nav
          className={cn(
            "flex justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 transition-all duration-700 ease-out delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          )}
          aria-label="Социальные сети"
        >
          {socials.map((social, idx) => {
            const Icon = social.icon
            return (
              <Link
                key={idx}
                href={social.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </Link>
            )
          })}
        </nav>

        <div
          className={cn(
            "flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10 mb-8 sm:mb-10 text-xs sm:text-sm transition-all duration-700 ease-out delay-250",
            isVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <a href="tel:+79139757612" className="hover:text-primary transition-colors">
            +7 (913) 975-76-12
          </a>
          <span className="text-white/20 hidden sm:inline" aria-hidden="true">|</span>
          <a href="mailto:info@flormajor.ru" className="hover:text-primary transition-colors">
            info@flormajor.ru
          </a>
          <span className="text-white/20 hidden sm:inline" aria-hidden="true">|</span>
          <span className="hidden sm:inline">ул. Карла Маркса, 50, Омск</span>
        </div>

        <div
          className={cn(
            "border-t border-white/10 pt-6 sm:pt-8 transition-all duration-700 ease-out delay-300",
            isVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <p className="text-xs text-[#666]">© {currentYear} Флор Мажор. Все права защищены.</p>
          <p className="text-xs text-[#555] mt-2">Режим работы: ежедневно, круглосуточно.</p>
        </div>
      </div>
    </footer>
  )
}
