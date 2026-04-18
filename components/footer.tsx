import Link from "next/link"
import { getIcon } from "@/lib/icons"
import type { ContactInfo, FooterConfig, SocialLink } from "@/lib/supabase"
import { typoStyle, type TypoMap } from "@/lib/typography"
import { FOOTER_BLOCK_IDS, type FooterBlockId } from "@/lib/validation/schemas"

interface FooterProps {
  config: FooterConfig
  socials: SocialLink[]
  contact: ContactInfo
  typography?: TypoMap
}

function normalizeOrder(order: readonly string[] | null | undefined): FooterBlockId[] {
  const allowed = new Set<FooterBlockId>(FOOTER_BLOCK_IDS)
  const result: FooterBlockId[] = []
  for (const raw of order ?? []) {
    if (typeof raw === 'string' && allowed.has(raw as FooterBlockId) && !result.includes(raw as FooterBlockId)) {
      result.push(raw as FooterBlockId)
    }
  }
  for (const id of FOOTER_BLOCK_IDS) {
    if (!result.includes(id)) result.push(id)
  }
  return result
}

export function Footer({ config, socials, contact, typography }: FooterProps) {
  const currentYear = new Date().getFullYear()
  const copyright = (config.copyright_template || '').replace(
    '{year}',
    String(currentYear),
  )
  const brandStyle = typoStyle(typography, 'footer', 'brand')
  const taglineStyle = typoStyle(typography, 'footer', 'tagline')
  const linkStyle = typoStyle(typography, 'footer', 'link')
  const copyrightStyle = typoStyle(typography, 'footer', 'copyright')

  const order = normalizeOrder(config.block_order)
  const showBrand = config.show_brand !== false
  const showContacts = config.show_contacts !== false
  const showSocials = config.show_socials !== false && socials.length > 0

  const blocks: Record<FooterBlockId, React.ReactNode> = {
    brand: showBrand ? (
      <div key="brand" className="text-center">
        <h2
          className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white mb-3 sm:mb-4"
          style={brandStyle}
        >
          {config.brand_display}
        </h2>
        {config.tagline && (
          <p className="text-white/60 text-xs sm:text-sm" style={taglineStyle}>
            {config.tagline}
          </p>
        )}
      </div>
    ) : null,
    socials: showSocials ? (
      <nav
        key="socials"
        className="flex justify-center gap-3 sm:gap-4"
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
    ) : null,
    contacts:
      showContacts &&
      (contact.phone_primary || contact.email || contact.address) ? (
        <div
          key="contacts"
          className="flex flex-wrap justify-center gap-y-2 gap-x-4 sm:gap-x-6 md:gap-x-10 text-xs sm:text-sm text-white/70 max-w-full"
          style={linkStyle}
        >
          {contact.phone_primary && (
            <a
              href={`tel:${contact.phone_primary.replace(/[^\d+]/g, '')}`}
              className="hover:text-primary transition-colors break-words"
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
                className="hover:text-primary transition-colors break-all"
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
              <span className="hidden sm:inline break-words">{contact.address}</span>
            </>
          )}
        </div>
      ) : null,
  }

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

      <div className="container mx-auto px-4 sm:px-6 relative z-10 space-y-8 sm:space-y-10">
        {order.map((id) => {
          const node = blocks[id]
          if (!node) return null
          return <div key={id}>{node}</div>
        })}

        <div className="border-t border-white/10 pt-6 sm:pt-8 text-center">
          <p className="text-xs text-white/50" style={copyrightStyle}>
            {copyright}
          </p>
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
