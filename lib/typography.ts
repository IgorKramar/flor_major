import type { CSSProperties } from 'react'
import type { TypographyRow } from '@/lib/supabase'

export type TypoMap = Map<string, TypographyRow>

export function typoKey(scope: string, element: string): string {
  return `${scope}:${element}`
}

export function buildTypoMap(rows: TypographyRow[] | null | undefined): TypoMap {
  const map: TypoMap = new Map()
  if (!rows) return map
  for (const row of rows) {
    map.set(typoKey(row.scope, row.element_key), row)
  }
  return map
}

function fontFamilyValue(family: string | null | undefined): string | undefined {
  if (!family) return undefined
  const trimmed = family.trim()
  if (!trimmed) return undefined
  if (trimmed.includes(',')) return trimmed
  return `'${trimmed}', serif`
}

export function typoStyle(
  rows: TypoMap | null | undefined,
  scope: string,
  element: string,
): CSSProperties {
  const row = rows?.get(typoKey(scope, element))
  if (!row) return {}
  const style: CSSProperties = {}
  const family = fontFamilyValue(row.font_family)
  if (family) style.fontFamily = family
  if (row.font_size) style.fontSize = row.font_size
  if (row.font_weight) style.fontWeight = row.font_weight as CSSProperties['fontWeight']
  if (row.line_height) style.lineHeight = row.line_height
  if (row.letter_spacing) style.letterSpacing = row.letter_spacing
  if (row.text_transform) style.textTransform = row.text_transform as CSSProperties['textTransform']
  if (row.text_align) style.textAlign = row.text_align as CSSProperties['textAlign']
  if (row.color) style.color = row.color
  return style
}

export function collectFontFamilies(rows: TypographyRow[] | null | undefined): string[] {
  if (!rows) return []
  const set = new Set<string>()
  for (const row of rows) {
    if (row.font_family) set.add(row.font_family.trim())
  }
  return Array.from(set).filter(Boolean)
}
