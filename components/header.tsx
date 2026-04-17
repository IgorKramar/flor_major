"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/lib/supabase"

interface HeaderProps {
  brand: string
  navItems: NavItem[]
}

export function Header({ brand, navItems }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hoverLink, setHoverLink] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out",
        scrolled
          ? "py-3 bg-background/90 backdrop-blur-xl shadow-lg shadow-black/5"
          : "py-5 bg-background/60 backdrop-blur-md"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link
          href={navItems[0]?.href ?? "#home"}
          className={cn(
            "font-heading text-2xl sm:text-3xl font-semibold tracking-widest text-foreground transition-transform duration-300",
            scrolled && "scale-95"
          )}
        >
          {brand}
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="Основная навигация">
          {navItems.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              target={link.target}
              className="text-xs font-medium uppercase tracking-wider hover:text-primary transition-all duration-300 relative group"
              onMouseEnter={() => setHoverLink(link.href)}
              onMouseLeave={() => setHoverLink(null)}
            >
              {link.label}
              <span
                className={cn(
                  "absolute -bottom-1 left-0 h-px bg-primary transition-all duration-300 ease-out",
                  hoverLink === link.href ? "w-full" : "w-0"
                )}
              />
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-3 rounded-2xl hover:bg-accent transition-all duration-300 flex items-center justify-center"
          aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-foreground" />
          ) : (
            <Menu className="w-6 h-6 text-foreground" />
          )}
        </button>
      </div>

      <div
        className={cn(
          "md:hidden absolute top-full left-0 right-0 bg-card shadow-xl border-t border-border transition-all duration-300 ease-out",
          mobileMenuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <nav className="flex flex-col p-6 gap-4" aria-label="Мобильная навигация">
          {navItems.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              target={link.target}
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium uppercase tracking-wider py-3 px-4 hover:bg-accent hover:text-primary rounded-xl transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
