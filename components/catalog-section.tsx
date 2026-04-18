import Link from "next/link"
import { getIcon } from "@/lib/icons"
import type { Category } from "@/lib/supabase"
import { typoStyle, type TypoMap } from "@/lib/typography"

interface CatalogSectionProps {
  categories: Category[]
  heading?: string
  subheading?: string
  typography?: TypoMap
}

export function CatalogSection({
  categories,
  heading = "Что у нас есть",
  subheading = "Всё для создания праздника и уюта",
  typography,
}: CatalogSectionProps) {
  if (categories.length === 0) return null

  const headingStyle = typoStyle(typography, 'categories', 'heading')
  const subheadingStyle = typoStyle(typography, 'categories', 'subheading')
  const cardTitleStyle = typoStyle(typography, 'categories', 'card_title')
  const cardDescStyle = typoStyle(typography, 'categories', 'card_description')

  return (
    <section
      id="categories"
      className="py-20 sm:py-24 md:py-28 bg-background"
      aria-labelledby="categories-heading"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2
            id="categories-heading"
            className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3"
            style={headingStyle}
          >
            {heading}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg" style={subheadingStyle}>
            {subheading}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {categories.map((item) => {
            const Icon = getIcon(item.icon_name)
            const href = `/catalog?category=${encodeURIComponent(item.slug)}`
            return (
              <Link
                key={item.id}
                href={href}
                className="group text-center p-6 sm:p-8 rounded-2xl bg-card border border-border/60 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-400 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Смотреть каталог: ${item.name}`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 sm:mb-6 rounded-2xl bg-gradient-to-br from-accent to-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-400 ease-out">
                  <Icon className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true" />
                </div>
                <h3
                  className="font-heading text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3 text-foreground group-hover:text-primary transition-colors duration-300"
                  style={cardTitleStyle}
                >
                  {item.name}
                </h3>
                {item.description && (
                  <p
                    className="text-muted-foreground text-xs sm:text-sm leading-relaxed"
                    style={cardDescStyle}
                  >
                    {item.description}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
