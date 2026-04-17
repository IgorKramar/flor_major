import Link from "next/link"
import { getIcon } from "@/lib/icons"
import type { ContactInfo, FooterConfig, SocialLink } from "@/lib/supabase"

interface FooterProps {
  config: FooterConfig
  socials: SocialLink[]
  contact: ContactInfo
}

export function Footer({ config, socials, contact }: FooterProps) {
  const currentYear = new Date().getFullYear()
  const copyright = (config.copyright_template || '').replace(
    '{year}',
    String(currentYear)
  )

  return (
    <footer
      className="relative pt-16 sm:pt-20 pb-8 sm:pb-10 overflow-hidden"
      style={{
        backgroundColor: config.background_color,
        color: config.text_color,
      }}
      role="contentinfo"
    >
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white mb-3 sm:mb-4">
          {config.brand_display}
        </h2>

        {config.tagline && (
          <p className="text-white/60 text-xs sm:text-sm mb-8 sm:mb-10">
            {config.tagline}
          </p>
        )}

        {socials.length > 0 && (
          <nav
            className="flex justify-center gap-3 sm:gap-4 mb-8 sm:mb-12"
            aria-label="Социальные сети"
          >
            {socials.map((social) => {
              const Icon = getIcon(social.icon_name)
              return (
                <Link
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.platform}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                </Link>
              )
            })}
          </nav>
        )}

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10 mb-8 sm:mb-10 text-xs sm:text-sm text-white/70">
          {contact.phone_primary && (
            <a
              href={`tel:${contact.phone_primary.replace(/[^\d+]/g, '')}`}
              className="hover:text-primary transition-colors"
            >
              {contact.phone_primary}
            </a>
          )}
          {contact.email && (
            <>
              <span className="text-white/20 hidden sm:inline" aria-hidden="true">
                |
              </span>
              <a
                href={`mailto:${contact.email}`}
                className="hover:text-primary transition-colors"
              >
                {contact.email}
              </a>
            </>
          )}
          {contact.address && (
            <>
              <span className="text-white/20 hidden sm:inline" aria-hidden="true">
                |
              </span>
              <span className="hidden sm:inline">{contact.address}</span>
            </>
          )}
        </div>

        <div className="border-t border-white/10 pt-6 sm:pt-8">
          <p className="text-xs text-white/50">{copyright}</p>
          {contact.working_hours && (
            <p className="text-xs text-white/40 mt-2">
              Режим работы: {contact.working_hours}
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}
