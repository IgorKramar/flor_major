import { createAnonSupabase } from '@/lib/supabase/admin'
import type {
  Category,
  ContactInfo,
  Feature,
  FooterConfig,
  HeroSettings,
  NavItem,
  Product,
  SiteSettings,
  SocialLink,
  ThemeSettings,
} from '@/lib/supabase'

export const SITE_CACHE_TAG = 'site-data'
export const SITE_REVALIDATE_SECONDS = 300

type UnwrappedPromise<T> = T extends Promise<infer U> ? U : T

async function safe<T>(p: Promise<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  const { data, error } = await p
  if (error) {
    console.error('[site-data] query error', error)
    return fallback
  }
  return (data ?? fallback) as T
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = createAnonSupabase()
  return safe<SiteSettings>(
    supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle() as unknown as Promise<{ data: SiteSettings | null; error: unknown }>,
    {
      id: 1,
      site_name: 'ФЛОРМАЖОР',
      site_description: '',
      meta_keywords: [],
      og_image_url: null,
      canonical_url: 'https://flormajor-omsk.ru',
      theme_color: '#c89f9f',
      enable_analytics: true,
      maintenance_mode: false,
      json_ld_override: null,
      rating_value: null,
      review_count: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  )
}

export async function getContactInfo(): Promise<ContactInfo> {
  const supabase = createAnonSupabase()
  return safe<ContactInfo>(
    supabase
      .from('contact_info')
      .select('*')
      .eq('id', 1)
      .maybeSingle() as unknown as Promise<{ data: ContactInfo | null; error: unknown }>,
    {
      id: 1,
      phone_primary: '',
      phone_secondary: null,
      email: null,
      address: '',
      working_hours: 'Круглосуточно',
      whatsapp: null,
      telegram: null,
      geo_lat: null,
      geo_lng: null,
      postal_code: null,
      address_region: null,
      address_locality: null,
      address_country: 'RU',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  )
}

export async function getThemeSettings(): Promise<ThemeSettings> {
  const supabase = createAnonSupabase()
  return safe<ThemeSettings>(
    supabase
      .from('theme_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle() as unknown as Promise<{ data: ThemeSettings | null; error: unknown }>,
    {
      id: 1,
      primary_color: '#c89f9f',
      primary_dark: '#a87f7f',
      accent_color: '#f5e6e0',
      background_color: '#ffffff',
      foreground_color: '#1e1e1e',
      font_heading: 'Cormorant Garamond',
      font_body: 'Montserrat',
      border_radius: '0.75rem',
      custom_css: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  )
}

export async function getHeroSettings(): Promise<HeroSettings | null> {
  const supabase = createAnonSupabase()
  const { data, error } = await supabase
    .from('hero_settings')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[site-data] hero error', error)
    return null
  }
  return (data ?? null) as HeroSettings | null
}

export async function getNavItems(): Promise<NavItem[]> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('nav_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as NavItem[]
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Product[]
}

export async function getHomeCategories(): Promise<Category[]> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .eq('show_on_home', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as Category[]
}

export async function getFeatures(): Promise<Feature[]> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('features')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as Feature[]
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('social_links')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as SocialLink[]
}

export async function getFooterConfig(): Promise<FooterConfig> {
  const supabase = createAnonSupabase()
  return safe<FooterConfig>(
    supabase
      .from('footer_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle() as unknown as Promise<{ data: FooterConfig | null; error: unknown }>,
    {
      id: 1,
      brand_display: 'ФЛОРМАЖОР',
      tagline: '',
      copyright_template: '© {year} ФЛОРМАЖОР. Все права защищены.',
      background_color: '#1e1e1e',
      text_color: '#f5f5f5',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  )
}

export type SiteData = {
  settings: SiteSettings
  contact: ContactInfo
  theme: ThemeSettings
  hero: HeroSettings | null
  nav: NavItem[]
  products: Product[]
  categories: Category[]
  features: Feature[]
  socials: SocialLink[]
  footer: FooterConfig
}

export async function getAllSiteData(): Promise<SiteData> {
  const [settings, contact, theme, hero, nav, products, categories, features, socials, footer] =
    await Promise.all([
      getSiteSettings(),
      getContactInfo(),
      getThemeSettings(),
      getHeroSettings(),
      getNavItems(),
      getFeaturedProducts(),
      getHomeCategories(),
      getFeatures(),
      getSocialLinks(),
      getFooterConfig(),
    ])

  return {
    settings,
    contact,
    theme,
    hero,
    nav,
    products,
    categories,
    features,
    socials,
    footer,
  }
}

// Re-export type aliases to avoid `any` propagation
export type _TypeFix = UnwrappedPromise<ReturnType<typeof getAllSiteData>>
