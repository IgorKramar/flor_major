"use client"

import { useEffect, useState } from "react"
import { Flower, Flower2, PartyPopper, Gift } from "lucide-react"
import { cn } from "@/lib/utils"

const catalogItems = [
  {
    icon: Flower,
    title: "Свежие букеты и композиции",
    description: "Классические и необычные. Интерьерные и свадебные. Работаем с разными запросами и бюджетами.",
  },
  {
    icon: Flower2,
    title: "Горшечные растения",
    description: "Уютные растения в стильных кашпо для дома и офиса. Поможем с выбором и консультируем после покупки.",
  },
  {
    icon: PartyPopper,
    title: "Шарики и декор",
    description: "Воздушные шары и праздничная атрибутика: свечи, открытки, гирлянды.",
  },
  {
    icon: Gift,
    title: "Подарки",
    description: "Статуэтки, сувениры, мягкие игрушки, обереги — подарки к любому поводу.",
  },
]

export function CatalogSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    const section = document.getElementById("catalog")
    if (section) {
      observer.observe(section)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="catalog" className="py-20 sm:py-24 md:py-28 bg-background" aria-labelledby="catalog-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div
          className={cn(
            "text-center mb-12 sm:mb-16 transition-all duration-700 ease-out",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <h2 id="catalog-heading" className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3">
            Что у нас есть
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">Всё для создания праздника и уюта</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {catalogItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <article
                key={idx}
                className={cn(
                  "group text-center p-6 sm:p-8 rounded-2xl bg-card hover:shadow-xl hover:shadow-primary/10 transition-all duration-400 ease-out hover:-translate-y-1",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}
                style={{
                  transitionDelay: isVisible ? `${idx * 100}ms` : "0ms",
                }}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 sm:mb-6 rounded-2xl bg-gradient-to-br from-accent to-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-400 ease-out">
                  <Icon className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{item.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
