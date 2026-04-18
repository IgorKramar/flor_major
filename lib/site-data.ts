import { createAnonSupabase } from '@/lib/supabase/admin'
import type { LandingSectionKey } from '@/lib/landing-section-theme'
import { LANDING_SECTION_KEYS } from '@/lib/landing-section-theme'
import type {
  CatalogPageSettings,
  Category,
  ContactInfo,
  Feature,
  FooterConfig,
  HeroSettings,
  LandingSectionStyle,
  NavItem,
  Product,
  ProductImage,
  ProductPageSettings,
  ProductWithImages,
  SiteSettings,
  SocialLink,
  ThanksPageSettings,
  ThemeSettings,
  TypographyRow,
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

function sortImages(images: ProductImage[] | null | undefined): ProductImage[] {
  if (!images || images.length === 0) return []
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.id - b.id
  })
}

function withImages(product: Product & { product_images?: ProductImage[] }): ProductWithImages {
  const { product_images, ...rest } = product
  return { ...rest, images: sortImages(product_images) }
}

export async function getFeaturedProducts(limit = 12): Promise<ProductWithImages[]> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('is_available', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = (data ?? []) as Array<Product & { product_images?: ProductImage[] }>
  return rows.map(withImages)
}

export async function getAllProducts(): Promise<ProductWithImages[]> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('is_available', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Array<Product & { product_images?: ProductImage[] }>
  return rows.map(withImages)
}

export async function getProductBySlug(slug: string): Promise<ProductWithImages | null> {
  if (!slug) return null
  const supabase = createAnonSupabase()
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('is_available', true)
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('[site-data] product by slug error', error)
    return null
  }
  if (!data) return null
  return withImages(data as Product & { product_images?: ProductImage[] })
}

export async function getAllCategories(): Promise<Category[]> {
  const supabase = createAnonSupabase()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data ?? []) as Category[]
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
      show_brand: true,
      show_contacts: true,
      show_socials: true,
      block_order: ['brand', 'contacts', 'socials'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  )
}

const CATALOG_PAGE_DEFAULTS: CatalogPageSettings = {
  id: 1,
  heading: 'Каталог товаров',
  subheading: 'Все наши композиции в одном месте',
  search_placeholder: 'Поиск по названию, описанию, категории…',
  filter_label: 'Категории',
  sort_label: 'Сортировка',
  sort_default_label: 'Без сортировки',
  sort_asc_label: 'Цена: по возрастанию',
  sort_desc_label: 'Цена: по убыванию',
  empty_state_text: 'Ничего не найдено. Попробуйте другой запрос или сбросьте фильтры.',
  cta_card_text: 'Подробнее',
  show_breadcrumbs: true,
  updated_at: new Date().toISOString(),
}

const PRODUCT_PAGE_DEFAULTS: ProductPageSettings = {
  id: 1,
  show_breadcrumbs: true,
  show_category_meta: true,
  cta_primary_text: 'Заказать',
  cta_primary_link: '/#contact',
  show_phone_cta: true,
  show_similar_products: false,
  similar_products_heading: 'Похожие товары',
  similar_products_limit: 4,
  updated_at: new Date().toISOString(),
}

const THANKS_PAGE_DEFAULTS: ThanksPageSettings = {
  id: 1,
  is_active: true,
  heading: 'Спасибо за заявку!',
  subheading: 'Мы свяжемся с вами в ближайшее время',
  body_text:
    'Наш флорист уже изучает ваш заказ и скоро перезвонит, чтобы уточнить детали и помочь с выбором.',
  image_url: null,
  image_alt: 'Благодарность',
  show_phone: true,
  button_text: 'Вернуться на главную',
  button_link: '/',
  updated_at: new Date().toISOString(),
}

export async function getCatalogPageSettings(): Promise<CatalogPageSettings> {
  const supabase = createAnonSupabase()
  return safe<CatalogPageSettings>(
    supabase
      .from('catalog_page_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle() as unknown as Promise<{ data: CatalogPageSettings | null; error: unknown }>,
    CATALOG_PAGE_DEFAULTS
  )
}

export async function getProductPageSettings(): Promise<ProductPageSettings> {
  const supabase = createAnonSupabase()
  return safe<ProductPageSettings>(
    supabase
      .from('product_page_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle() as unknown as Promise<{ data: ProductPageSettings | null; error: unknown }>,
    PRODUCT_PAGE_DEFAULTS
  )
}

export async function getThanksPageSettings(): Promise<ThanksPageSettings> {
  const supabase = createAnonSupabase()
  return safe<ThanksPageSettings>(
    supabase
      .from('thanks_page_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle() as unknown as Promise<{ data: ThanksPageSettings | null; error: unknown }>,
    THANKS_PAGE_DEFAULTS
  )
}

export async function getTypography(): Promise<TypographyRow[]> {
  const supabase = createAnonSupabase()
  const { data, error } = await supabase.from('typography_settings').select('*')
  if (error) {
    console.error('[site-data] typography error', error)
    return []
  }
  return (data ?? []) as TypographyRow[]
}

export async function getLandingSectionStyles(): Promise<
  Partial<Record<LandingSectionKey, LandingSectionStyle>>
> {
  const supabase = createAnonSupabase()
  const { data, error } = await supabase.from('landing_section_styles').select('*')
  if (error) {
    console.error('[site-data] landing_section_styles error', error)
    return {}
  }
  const out: Partial<Record<LandingSectionKey, LandingSectionStyle>> = {}
  for (const row of data ?? []) {
    const k = row.section_key as LandingSectionKey
    if ((LANDING_SECTION_KEYS as readonly string[]).includes(k)) {
      out[k] = row as LandingSectionStyle
    }
  }
  return out
}

export type SiteData = {
  settings: SiteSettings
  contact: ContactInfo
  theme: ThemeSettings
  hero: HeroSettings | null
  nav: NavItem[]
  products: ProductWithImages[]
  categories: Category[]
  features: Feature[]
  socials: SocialLink[]
  footer: FooterConfig
  typography: TypographyRow[]
  catalogPage: CatalogPageSettings
  productPage: ProductPageSettings
  thanksPage: ThanksPageSettings
  landingSections: Partial<Record<LandingSectionKey, LandingSectionStyle>>
}

export async function getAllSiteData(): Promise<SiteData> {
  const [
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
    typography,
    catalogPage,
    productPage,
    thanksPage,
    landingSections,
  ] = await Promise.all([
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
    getTypography(),
    getCatalogPageSettings(),
    getProductPageSettings(),
    getThanksPageSettings(),
    getLandingSectionStyles(),
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
    typography,
    catalogPage,
    productPage,
    thanksPage,
    landingSections,
  }
}

// Re-export type aliases to avoid `any` propagation
export type _TypeFix = UnwrappedPromise<ReturnType<typeof getAllSiteData>>
