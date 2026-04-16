"use client"

import { useEffect, useState } from "react"
import { Flower, Truck, Palette } from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: Flower,
    title: "Большой выбор",
    description: "Цветы со всего света: от известных сортов роз и хризантем до экзотических калл и орхидей",
  },
  {
    icon: Truck,
    title: "Доставка по городу",
    description: "Бесплатно при заказе от 5 000 ₽, качественно упакуем, согласуем время и поздравим от вашего имени",
  },
  {
    icon: Palette,
    title: "Индивидуальный подход",
    description: "Соберём букет по фото или описанию. Поможем подобрать лучший вариант под ваши условия",
  },
]

export function FeaturesSection() {
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

    const section = document.getElementById("features")
    if (section) {
      observer.observe(section)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="features" className="py-20 sm:py-24 md:py-28 bg-card" aria-labelledby="features-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 id="features-heading" className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3">
            Почему выбирают нас
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <article
                key={idx}
                className={cn(
                  "p-5 sm:p-7 md:p-9 rounded-xl bg-background text-center hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/7 transition-all duration-400 ease-out",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
                style={{
                  transitionDelay: isVisible ? `${idx * 150}ms` : "0ms",
                }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 md:mb-6 rounded-full bg-accent flex items-center justify-center text-primary">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3">{feat.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm md:text-base">{feat.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
