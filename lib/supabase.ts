import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase/env'

/**
 * @deprecated Используйте `createBrowserSupabase` из `@/lib/supabase/client`
 * (клиент) или `createServerSupabase` из `@/lib/supabase/server` (сервер).
 * Будет удалено в версии 2.0.0.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * @deprecated Используйте `createAdminSupabase` из `@/lib/supabase/admin`.
 * Будет удалено в версии 2.0.0.
 */
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return createClient<Database>(SUPABASE_URL, serviceRoleKey)
}

export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Database,
} from './database.types'

export type Product = import('./database.types').Tables<'products'>
export type ProductImage = import('./database.types').Tables<'product_images'>
export type HeroSettings = import('./database.types').Tables<'hero_settings'>
export type SiteSettings = import('./database.types').Tables<'site_settings'>
export type ContactInfo = import('./database.types').Tables<'contact_info'>
export type ThemeSettings = import('./database.types').Tables<'theme_settings'>
export type FooterConfig = import('./database.types').Tables<'footer_config'>
export type Category = import('./database.types').Tables<'categories'>
export type NavItem = import('./database.types').Tables<'nav_items'>
export type Feature = import('./database.types').Tables<'features'>
export type SocialLink = import('./database.types').Tables<'social_links'>
export type TypographyRow = import('./database.types').Tables<'typography_settings'>
export type CatalogPageSettings = import('./database.types').Tables<'catalog_page_settings'>
export type ProductPageSettings = import('./database.types').Tables<'product_page_settings'>
export type LandingSectionStyle = import('./database.types').Tables<'landing_section_styles'>

export type ProductWithImages = Product & { images: ProductImage[] }
