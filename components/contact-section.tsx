import type { CSSProperties } from "react"
import { MapPin, Phone, Mail } from "lucide-react"
import type { ContactInfo } from "@/lib/supabase"
import { typoStyle, type TypoMap } from "@/lib/typography"

function telHref(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "")
  return `tel:${digits}`
}

interface ContactSectionProps {
  contact: ContactInfo
  heading?: string
  subheading?: string
  typography?: TypoMap
  themeStyle?: CSSProperties
}

export function ContactSection({
  contact,
  heading = "Свяжитесь с нами",
  subheading = "Поможем подобрать идеальный букет или подарок по случаю.",
  typography,
  themeStyle,
}: ContactSectionProps) {
  const headingStyle = typoStyle(typography, 'contact', 'heading')
  const subheadingStyle = typoStyle(typography, 'contact', 'subheading')
  const labelStyle = typoStyle(typography, 'contact', 'label')
  const valueStyle = typoStyle(typography, 'contact', 'value')
  return (
    <section
      id="contact"
      className="py-20 sm:py-24 md:py-28"
      style={{
        background:
          "linear-gradient(140deg, var(--accent) 0%, var(--background) 100%)",
        ...themeStyle,
      }}
      aria-labelledby="contact-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div>
          <h2
            id="contact-heading"
            className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-4 text-center"
            style={headingStyle}
          >
            {heading}
          </h2>
          <p
            className="text-muted-foreground text-base sm:text-lg mb-10 sm:mb-12 text-center"
            style={subheadingStyle}
          >
            {subheading}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            {contact.address && (
              <address className="not-italic">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-5">
                    <MapPin className="w-7 h-7 sm:w-9 sm:h-9" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium mb-2 text-lg sm:text-xl" style={{ ...labelStyle, textAlign: 'center' }}>
                    Адрес
                  </h3>
                  <p
                    className="text-muted-foreground text-base sm:text-lg break-words"
                    style={{ ...valueStyle, textAlign: 'center' }}
                  >
                    {contact.address}
                    {contact.working_hours && (
                      <>
                        <br />
                        {contact.working_hours}
                      </>
                    )}
                  </p>
                </div>
              </address>
            )}

            {contact.phone_primary && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-5">
                  <Phone className="w-7 h-7 sm:w-9 sm:h-9" aria-hidden="true" />
                </div>
                <h3 className="font-medium mb-2 text-lg sm:text-xl" style={{ ...labelStyle, textAlign: 'center' }}>
                  Телефон
                </h3>
                <p
                  className="text-muted-foreground text-base sm:text-lg break-words"
                  style={{ ...valueStyle, textAlign: 'center' }}
                >
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
            )}

            {(contact.email || contact.whatsapp || contact.telegram) && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-5">
                  <Mail className="w-7 h-7 sm:w-9 sm:h-9" aria-hidden="true" />
                </div>
                <h3 className="font-medium mb-2 text-lg sm:text-xl" style={{ ...labelStyle, textAlign: 'center' }}>
                  Email & Мессенджеры
                </h3>
                <p
                  className="text-muted-foreground text-base sm:text-lg break-words"
                  style={{ ...valueStyle, textAlign: 'center' }}
                >
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
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
