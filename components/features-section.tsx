import { getIcon } from "@/lib/icons"
import type { Feature } from "@/lib/supabase"
import { typoStyle, type TypoMap } from "@/lib/typography"

interface FeaturesSectionProps {
  features: Feature[]
  heading?: string
  subheading?: string
  typography?: TypoMap
}

export function FeaturesSection({
  features,
  heading = "Почему выбирают нас",
  subheading,
  typography,
}: FeaturesSectionProps) {
  if (features.length === 0) return null

  const headingStyle = typoStyle(typography, 'features', 'heading')
  const subheadingStyle = typoStyle(typography, 'features', 'subheading')
  const cardTitleStyle = typoStyle(typography, 'features', 'card_title')
  const cardDescStyle = typoStyle(typography, 'features', 'card_description')

  return (
    <section
      id="features"
      className="py-20 sm:py-24 md:py-28 bg-card"
      aria-labelledby="features-heading"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2
            id="features-heading"
            className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3"
            style={headingStyle}
          >
            {heading}
          </h2>
          {subheading ? (
            <p className="text-muted-foreground text-base sm:text-lg" style={subheadingStyle}>
              {subheading}
            </p>
          ) : null}
        </div>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
          {features.map((feat) => {
            const Icon = getIcon(feat.icon_name)
            return (
              <article
                key={feat.id}
                className="p-5 sm:p-7 md:p-9 rounded-xl bg-background text-center hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/7 transition-all duration-400 ease-out"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-5 md:mb-6 rounded-full bg-accent flex items-center justify-center text-primary">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                </div>
                <h3
                  className="font-heading text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3"
                  style={cardTitleStyle}
                >
                  {feat.title}
                </h3>
                <p
                  className="text-muted-foreground text-xs sm:text-sm md:text-base"
                  style={cardDescStyle}
                >
                  {feat.description}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
