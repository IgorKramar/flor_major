import type { CSSProperties } from 'react'
import type { Tables } from '@/lib/database.types'

type LandingSectionStyleRow = Tables<'landing_section_styles'>

export const LANDING_SECTION_KEYS = [
  'hero',
  'products',
  'categories',
  'features',
  'contact',
] as const

export type LandingSectionKey = (typeof LANDING_SECTION_KEYS)[number]

export const LANDING_SECTION_LABELS: Record<LandingSectionKey, string> = {
  hero: 'Первый экран (Hero)',
  products: 'Карусель товаров',
  categories: 'Категории',
  features: 'Преимущества',
  contact: 'Контакты и форма',
}

function cssUrl(u: string): string {
  const safe = u.trim().replace(/\\/g, '/').replace(/'/g, "\\'")
  return `url('${safe}')`
}

export type SectionThemeRowInput = Pick<
  LandingSectionStyleRow,
  | 'background_mode'
  | 'background_solid_hex'
  | 'background_gradient_from_hex'
  | 'background_gradient_to_hex'
  | 'background_gradient_angle'
  | 'background_image_url'
  | 'background_image_overlay'
  | 'foreground'
  | 'muted_foreground'
  | 'card'
  | 'primary_color'
  | 'primary_foreground'
>

/** Inline styles + CSS variables scoped to a landing section `<section>`. */
export function buildSectionThemeStyle(row: SectionThemeRowInput | null): CSSProperties {
  if (!row) return {}
  const s: Record<string, string> = {}

  const mode = (row.background_mode ?? 'default').trim() || 'default'
  if (mode === 'solid') {
    const hex = row.background_solid_hex?.trim()
    if (hex) s.background = hex
  } else if (mode === 'gradient') {
    const a = row.background_gradient_from_hex?.trim()
    const b = row.background_gradient_to_hex?.trim()
    if (a && b) {
      const angle = row.background_gradient_angle ?? 135
      s.background = `linear-gradient(${angle}deg, ${a}, ${b})`
    }
  } else if (mode === 'image') {
    const u = row.background_image_url?.trim()
    if (u) {
      const ov = row.background_image_overlay ?? 0.45
      s.backgroundImage = `linear-gradient(rgba(0,0,0,${ov}), rgba(0,0,0,${ov})), ${cssUrl(u)}`
      s.backgroundSize = 'cover'
      s.backgroundPosition = 'center'
      s.backgroundRepeat = 'no-repeat'
      s.backgroundColor = '#0f172a'
    }
  }

  const fg = row.foreground?.trim()
  if (fg) {
    s.color = fg
    s['--foreground'] = fg
  }
  const mf = row.muted_foreground?.trim()
  if (mf) s['--muted-foreground'] = mf
  const card = row.card?.trim()
  if (card) s['--card'] = card
  const pr = row.primary_color?.trim()
  if (pr) s['--primary'] = pr
  const pf = row.primary_foreground?.trim()
  if (pf) s['--primary-foreground'] = pf
  return s as CSSProperties
}
