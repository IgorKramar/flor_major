import { z } from 'zod'

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Некорректный HEX-цвет')

const optionalUrl = z
  .string()
  .url('Некорректный URL')
  .or(z.literal(''))
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

const optionalText = z.string().trim().max(5000).optional().nullable()

export const productImageSchema = z.object({
  id: z.coerce.number().int().optional(),
  url: z.string().trim().url('Некорректный URL'),
  alt: z.string().trim().max(200).optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
  is_primary: z.boolean().default(false),
})
export type ProductImageInput = z.infer<typeof productImageSchema>

export const productSchema = z.object({
  title: z.string().trim().min(2).max(200),
  price_amount: z.coerce.number().min(0).max(10_000_000),
  price_currency: z.string().trim().min(1).max(8).default('RUB'),
  price_display: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: optionalText,
  /** @deprecated Используйте images[]; поле остаётся как зеркало первичной картинки. */
  image_url: z
    .string()
    .trim()
    .url()
    .or(z.literal(''))
    .transform((v) => v || null)
    .nullable()
    .optional(),
  images: z.array(productImageSchema).default([]),
  badge: z.string().trim().max(40).optional().nullable(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, 'Только латиница, цифры и дефисы')
    .max(120)
    .optional()
    .nullable(),
  is_featured: z.boolean().default(false),
  is_available: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
})

export const categorySchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(80),
  name: z.string().trim().min(2).max(120),
  description: optionalText,
  icon_name: z.string().trim().max(40).optional().nullable(),
  image_url: optionalUrl,
  image_alt: z.string().trim().max(200).optional().nullable(),
  overlay_opacity: z.coerce.number().min(0).max(1).default(0.55),
  show_icon_over_image: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
  show_on_home: z.boolean().default(true),
  is_active: z.boolean().default(true),
})

export const navItemSchema = z.object({
  label: z.string().trim().min(1).max(60),
  href: z.string().trim().min(1).max(200),
  sort_order: z.coerce.number().int().default(0),
  target: z.enum(['_self', '_blank']).default('_self'),
  is_active: z.boolean().default(true),
})

export const featureSchema = z.object({
  icon_name: z.string().trim().min(1).max(40).default('Sparkles'),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(500),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
})

export const socialLinkSchema = z.object({
  platform: z.string().trim().min(2).max(40),
  url: z.string().trim().url(),
  icon_name: z.string().trim().max(40).optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
})

export const heroSchema = z.object({
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(500),
  headline_accent: z.string().trim().max(120).optional().nullable(),
  cta_text: z.string().trim().min(1).max(80),
  cta_link: z.string().trim().min(1).max(200),
  secondary_cta_text: z.string().trim().max(80).optional().nullable(),
  secondary_cta_link: z.string().trim().max(200).optional().nullable(),
  background_image: optionalUrl,
  alt_text: z.string().trim().max(200).optional().nullable(),
  overlay_opacity: z.coerce.number().min(0).max(1).default(0.4),
  is_active: z.boolean().default(true),
})

export const contactInfoSchema = z.object({
  phone_primary: z.string().trim().min(4).max(40),
  phone_secondary: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().or(z.literal('')).transform((v) => v || null).nullable(),
  address: z.string().trim().max(300),
  working_hours: z.string().trim().max(120),
  whatsapp: z.string().trim().max(200).optional().nullable(),
  telegram: z.string().trim().max(200).optional().nullable(),
  geo_lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  geo_lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  address_region: z.string().trim().max(120).optional().nullable(),
  address_locality: z.string().trim().max(120).optional().nullable(),
  address_country: z.string().trim().max(8).optional().nullable(),
})

export const themeSchema = z.object({
  primary_color: hexColor,
  primary_dark: hexColor,
  accent_color: hexColor,
  background_color: hexColor,
  foreground_color: hexColor,
  font_heading: z.string().trim().min(2).max(80),
  font_body: z.string().trim().min(2).max(80),
  border_radius: z.string().trim().max(20),
  custom_css: z.string().max(20_000).optional().nullable(),
})

export const siteSettingsSchema = z.object({
  site_name: z.string().trim().min(1).max(120),
  site_description: z.string().trim().max(1000),
  meta_keywords: z.array(z.string().trim().max(80)).default([]),
  og_image_url: optionalUrl,
  canonical_url: z.string().trim().url(),
  theme_color: hexColor,
  enable_analytics: z.boolean().default(true),
  maintenance_mode: z.boolean().default(false),
  rating_value: z.coerce.number().min(0).max(5).optional().nullable(),
  review_count: z.coerce.number().int().min(0).optional().nullable(),
  json_ld_override: z.unknown().optional().nullable(),
})

export const FOOTER_BLOCK_IDS = ['brand', 'contacts', 'socials'] as const
export type FooterBlockId = (typeof FOOTER_BLOCK_IDS)[number]

export const footerSchema = z.object({
  brand_display: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(300),
  copyright_template: z.string().trim().max(300),
  background_color: hexColor,
  text_color: hexColor,
  show_brand: z.boolean().default(true),
  show_contacts: z.boolean().default(true),
  show_socials: z.boolean().default(true),
  block_order: z
    .array(z.enum(FOOTER_BLOCK_IDS))
    .default(['brand', 'contacts', 'socials']),
})

export const catalogPageSettingsSchema = z.object({
  heading: z.string().trim().min(1).max(200),
  subheading: z.string().trim().max(500),
  search_placeholder: z.string().trim().max(200),
  filter_label: z.string().trim().max(120),
  sort_label: z.string().trim().max(120),
  sort_default_label: z.string().trim().max(120),
  sort_asc_label: z.string().trim().max(120),
  sort_desc_label: z.string().trim().max(120),
  empty_state_text: z.string().trim().max(500),
  cta_card_text: z.string().trim().max(80),
  show_breadcrumbs: z.boolean().default(true),
})
export type CatalogPageSettingsInput = z.infer<typeof catalogPageSettingsSchema>

export const productPageSettingsSchema = z.object({
  show_breadcrumbs: z.boolean().default(true),
  show_category_meta: z.boolean().default(true),
  cta_primary_text: z.string().trim().min(1).max(80),
  cta_primary_link: z.string().trim().min(1).max(200),
  show_phone_cta: z.boolean().default(true),
  show_similar_products: z.boolean().default(false),
  similar_products_heading: z.string().trim().max(200),
  similar_products_limit: z.coerce.number().int().min(1).max(12).default(4),
})
export type ProductPageSettingsInput = z.infer<typeof productPageSettingsSchema>

const typographyField = z
  .string()
  .trim()
  .max(120)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))

export const typographySchema = z.object({
  scope: z.string().trim().min(1).max(60),
  element_key: z.string().trim().min(1).max(60),
  font_family: typographyField,
  font_size: typographyField,
  font_weight: typographyField,
  line_height: typographyField,
  letter_spacing: typographyField,
  text_transform: typographyField,
  text_align: typographyField,
  color: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
})
export type TypographyInput = z.infer<typeof typographySchema>

/** #RRGGBB or null (пустая строка → null). */
const optionalHex6 = z.preprocess(
  (v: unknown) =>
    v === '' || v === undefined || v === null ? null : String(v).trim(),
  z.union([z.null(), z.string().regex(/^#[0-9a-fA-F]{6}$/i)]),
)

export const landingSectionStyleSchema = z.object({
  section_key: z.enum(['hero', 'products', 'categories', 'features', 'contact']),
  background_mode: z.enum(['default', 'solid', 'gradient', 'image']).default('default'),
  background_solid_hex: optionalHex6,
  background_gradient_from_hex: optionalHex6,
  background_gradient_to_hex: optionalHex6,
  background_gradient_angle: z.coerce.number().int().min(0).max(360).default(135),
  background_image_url: optionalUrl,
  background_image_overlay: z.coerce.number().min(0).max(1).default(0.45),
  foreground: optionalHex6,
  muted_foreground: optionalHex6,
  card: optionalHex6,
  primary_color: optionalHex6,
  primary_foreground: optionalHex6,
})
export type LandingSectionStyleInput = z.infer<typeof landingSectionStyleSchema>
