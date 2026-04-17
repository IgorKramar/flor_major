import { getIcon } from "@/lib/icons"
import type { Category } from "@/lib/supabase"

interface CatalogSectionProps {
  categories: Category[]
  heading?: string
  subheading?: string
}

export function CatalogSection({
  categories,
  heading = "Что у нас есть",
  subheading = "Всё для создания праздника и уюта",
}: CatalogSectionProps) {
  if (categories.length === 0) return null

  return (
    <section
      id="catalog"
      className="py-20 sm:py-24 md:py-28 bg-background"
      aria-labelledby="catalog-heading"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2
            id="catalog-heading"
            className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3"
          >
            {heading}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">{subheading}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {categories.map((item) => {
            const Icon = getIcon(item.icon_name)
            return (
              <article
                key={item.id}
                className="group text-center p-6 sm:p-8 rounded-2xl bg-card hover:shadow-xl hover:shadow-primary/10 transition-all duration-400 ease-out hover:-translate-y-1"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 sm:mb-6 rounded-2xl bg-gradient-to-br from-accent to-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-400 ease-out">
                  <Icon className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                    {item.description}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
