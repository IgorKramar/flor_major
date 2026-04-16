"use client"

import { useEffect, useState } from "react"
import { MapPin, Phone, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { ContactForm } from "./contact-form"

export function ContactSection() {
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

    const section = document.getElementById("contact")
    if (section) {
      observer.observe(section)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="contact"
      className="py-20 sm:py-24 md:py-28"
      style={{ background: "linear-gradient(140deg, var(--accent) 0%, var(--background) 100%)" }}
      aria-labelledby="contact-heading"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr,1.1fr] gap-8 sm:gap-10 md:gap-14 items-start">
          <div
            className={cn(
              "transition-all duration-700 ease-out",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
            )}
          >
            <h2 id="contact-heading" className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-4">
              Свяжитесь с нами
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8">
              Поможем подобрать идеальный букет или подарок по случаю.
            </p>

            <div className="space-y-5 sm:space-y-6">
              <address className="not-italic">
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                    <MapPin className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Адрес</h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      г. Омск, ул. Карла Маркса, 50
                      <br />
                      Ежедневно. Круглосуточно.
                    </p>
                  </div>
                </div>
              </address>

              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                  <Phone className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Телефон</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    <a href="tel:+79333033942" className="hover:text-primary transition-colors">
                      +7 (933) 303-39-42
                    </a>
                    <br />
                    <a href="tel:+79139757612" className="hover:text-primary transition-colors">
                      +7 (913) 975-76-12
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Email & Мессенджеры</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    <a href="mailto:info@flormajor.ru" className="hover:text-primary transition-colors">
                      info@flormajor.ru
                    </a>
                    <br />
                    WhatsApp / Telegram
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "transition-all duration-700 ease-out delay-100",
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
            )}
          >
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  )
}
