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

const optionalText = z.string().trim().max(5000).optional().nullable()

export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Введите имя').max(120),
  phone: z
    .string()
    .trim()
    .min(6, 'Введите телефон')
    .max(32)
    .regex(/^[\d+()\-\s]+$/, 'Телефон содержит недопустимые символы'),
  interest: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  source: z.string().trim().max(60).optional().nullable(),
})
export type LeadInput = z.infer<typeof leadSchema>

export const productSchema = z.object({
  title: z.string().trim().min(2).max(200),
  price_amount: z.coerce.number().min(0).max(10_000_000),
  price_currency: z.string().trim().min(1).max(8).default('RUB'),
  description: optionalText,
  image_url: z.string().trim().url().or(z.literal('')).transform((v) => v || null).nullable(),
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

export const footerSchema = z.object({
  brand_display: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(300),
  copyright_template: z.string().trim().max(300),
  background_color: hexColor,
  text_color: hexColor,
})
