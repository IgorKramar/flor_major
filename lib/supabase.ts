import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaojqaqpreuvcwxmngqp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_wwjucH34S54iXSDO1St8Gg_6pg1neBe'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key (for API routes only)
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return createClient(supabaseUrl, supabaseAnonKey)
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

// Types
export interface Product {
  id: number
  title: string
  price: string
  description: string
  image_url: string
  badge?: string
  is_featured?: boolean
  is_available: boolean
  category?: string
  created_at: string
  updated_at: string
}

export interface Lead {
  id: number
  name: string
  phone: string
  message?: string
  interest?: string
  status: 'new' | 'contacted' | 'completed' | 'cancelled'
  created_at: string
}

export interface SiteConfig {
  id: number
  config_key: string
  config_value: string
  created_at: string
  updated_at: string
}

export interface HeroSettings {
  id: number
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
  background_image?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SocialLink {
  id: number
  platform: string
  url: string
  icon?: string
  display_order: number
  is_active: boolean
  created_at: string
}
