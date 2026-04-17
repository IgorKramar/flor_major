import { describe, it, expect } from 'vitest'
import {
  leadSchema,
  productSchema,
  categorySchema,
  navItemSchema,
  featureSchema,
  socialLinkSchema,
  heroSchema,
  contactInfoSchema,
  themeSchema,
  siteSettingsSchema,
  footerSchema,
} from '@/lib/validation/schemas'

describe('leadSchema', () => {
  it('accepts a valid lead payload', () => {
    const result = leadSchema.safeParse({
      name: 'Анна',
      phone: '+7 (901) 234-56-78',
      interest: 'Свадебный букет',
      message: 'Нужна консультация',
      source: 'landing',
    })
    expect(result.success).toBe(true)
  })

  it('rejects too short name', () => {
    const result = leadSchema.safeParse({ name: 'A', phone: '+7999' })
    expect(result.success).toBe(false)
  })

  it('rejects phone with forbidden characters', () => {
    const result = leadSchema.safeParse({ name: 'Анна', phone: 'abcdef' })
    expect(result.success).toBe(false)
  })
})

describe('productSchema', () => {
  it('accepts minimal product', () => {
    const result = productSchema.safeParse({
      title: 'Букет «Весна»',
      price_amount: '4500',
      image_url: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.price_amount).toBe(4500)
      expect(result.data.image_url).toBeNull()
      expect(result.data.price_currency).toBe('RUB')
    }
  })

  it('rejects negative prices', () => {
    const result = productSchema.safeParse({ title: 'Букет', price_amount: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid slug characters', () => {
    const result = productSchema.safeParse({
      title: 'Букет',
      price_amount: 100,
      slug: 'Букет Весна',
    })
    expect(result.success).toBe(false)
  })
})

describe('categorySchema', () => {
  it('requires slug and name', () => {
    expect(
      categorySchema.safeParse({ slug: 'roses', name: 'Розы' }).success,
    ).toBe(true)
  })

  it('rejects slug with uppercase', () => {
    expect(
      categorySchema.safeParse({ slug: 'Roses', name: 'Розы' }).success,
    ).toBe(false)
  })
})

describe('navItemSchema', () => {
  it('defaults target to _self', () => {
    const parsed = navItemSchema.parse({ label: 'Главная', href: '#home' })
    expect(parsed.target).toBe('_self')
    expect(parsed.is_active).toBe(true)
  })
})

describe('featureSchema', () => {
  it('requires title and description', () => {
    expect(
      featureSchema.safeParse({
        title: 'Свежесть',
        description: 'Только что срезанные цветы',
      }).success,
    ).toBe(true)
  })
})

describe('socialLinkSchema', () => {
  it('requires valid URL', () => {
    expect(
      socialLinkSchema.safeParse({ platform: 'Instagram', url: 'not-a-url' })
        .success,
    ).toBe(false)
  })
})

describe('heroSchema', () => {
  it('clamps overlay opacity between 0 and 1', () => {
    const result = heroSchema.safeParse({
      title: 'Добро пожаловать',
      subtitle: '',
      cta_text: 'Заказать',
      cta_link: '#contact',
      background_image: '',
      overlay_opacity: 2,
    })
    expect(result.success).toBe(false)
  })
})

describe('contactInfoSchema', () => {
  it('accepts empty email as null', () => {
    const result = contactInfoSchema.safeParse({
      phone_primary: '+7 901 234 56 78',
      email: '',
      address: 'Омск',
      working_hours: '24/7',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBeNull()
    }
  })
})

describe('themeSchema', () => {
  it('rejects invalid hex color', () => {
    const result = themeSchema.safeParse({
      primary_color: 'red',
      primary_dark: '#000000',
      accent_color: '#ffffff',
      background_color: '#ffffff',
      foreground_color: '#000000',
      font_heading: 'Inter',
      font_body: 'Inter',
      border_radius: '0.5rem',
    })
    expect(result.success).toBe(false)
  })
})

describe('siteSettingsSchema', () => {
  it('requires valid canonical URL', () => {
    const result = siteSettingsSchema.safeParse({
      site_name: 'ФлорМажор',
      site_description: '',
      canonical_url: 'not-a-url',
      theme_color: '#c89f9f',
    })
    expect(result.success).toBe(false)
  })
})

describe('footerSchema', () => {
  it('requires both color fields', () => {
    const result = footerSchema.safeParse({
      brand_display: 'ФлорМажор',
      tagline: '',
      copyright_template: '© {year}',
      background_color: '#1e1e1e',
      text_color: '#ffffff',
    })
    expect(result.success).toBe(true)
  })
})
