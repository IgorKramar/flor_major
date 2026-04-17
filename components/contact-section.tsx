import { MapPin, Phone, Mail } from "lucide-react"
import { ContactForm } from "./contact-form"
import type { ContactInfo } from "@/lib/supabase"

function telHref(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "")
  return `tel:${digits}`
}

interface ContactSectionProps {
  contact: ContactInfo
  heading?: string
  subheading?: string
}

export function ContactSection({
  contact,
  heading = "Свяжитесь с нами",
  subheading = "Поможем подобрать идеальный букет или подарок по случаю.",
}: ContactSectionProps) {
  return (
    <section
      id="contact"
      className="py-20 sm:py-24 md:py-28"
      style={{
        background:
          "linear-gradient(140deg, var(--accent) 0%, var(--background) 100%)",
      }}
      aria-labelledby="contact-heading"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 sm:gap-10 md:gap-14 items-start">
          <div>
            <h2
              id="contact-heading"
              className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-4"
            >
              {heading}
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8">
              {subheading}
            </p>

            <div className="space-y-5 sm:space-y-6">
              {contact.address && (
                <address className="not-italic">
                  <div className="flex gap-3 sm:gap-4 items-start">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                      <MapPin className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium mb-1">Адрес</h3>
                      <p className="text-muted-foreground text-sm sm:text-base break-words">
                        {contact.address}
                        {contact.working_hours && (
                          <>
                            <br />
                            {contact.working_hours}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </address>
              )}

              {contact.phone_primary && (
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                    <Phone className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium mb-1">Телефон</h3>
                    <p className="text-muted-foreground text-sm sm:text-base break-words">
                      <a
                        href={telHref(contact.phone_primary)}
                        className="hover:text-primary transition-colors"
                      >
                        {contact.phone_primary}
                      </a>
                      {contact.phone_secondary && (
                        <>
                          <br />
                          <a
                            href={telHref(contact.phone_secondary)}
                            className="hover:text-primary transition-colors"
                          >
                            {contact.phone_secondary}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {(contact.email || contact.whatsapp || contact.telegram) && (
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium mb-1">Email & Мессенджеры</h3>
                    <p className="text-muted-foreground text-sm sm:text-base break-words">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="hover:text-primary transition-colors break-all"
                        >
                          {contact.email}
                        </a>
                      )}
                      {(contact.whatsapp || contact.telegram) && (
                        <>
                          {contact.email && <br />}
                          {contact.whatsapp && (
                            <a
                              href={contact.whatsapp}
                              target="_blank"
                              rel="noopener"
                              className="hover:text-primary transition-colors"
                            >
                              WhatsApp
                            </a>
                          )}
                          {contact.whatsapp && contact.telegram && " / "}
                          {contact.telegram && (
                            <a
                              href={contact.telegram}
                              target="_blank"
                              rel="noopener"
                              className="hover:text-primary transition-colors"
                            >
                              Telegram
                            </a>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  )
}
