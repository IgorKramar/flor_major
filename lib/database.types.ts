export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon_name: string | null
          id: number
          is_active: boolean
          name: string
          show_on_home: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: number
          is_active?: boolean
          name: string
          show_on_home?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: number
          is_active?: boolean
          name?: string
          show_on_home?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contact_info: {
        Row: {
          address: string
          address_country: string | null
          address_locality: string | null
          address_region: string | null
          created_at: string
          email: string | null
          geo_lat: number | null
          geo_lng: number | null
          id: number
          phone_primary: string
          phone_secondary: string | null
          postal_code: string | null
          telegram: string | null
          updated_at: string
          whatsapp: string | null
          working_hours: string
        }
        Insert: {
          address?: string
          address_country?: string | null
          address_locality?: string | null
          address_region?: string | null
          created_at?: string
          email?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: number
          phone_primary?: string
          phone_secondary?: string | null
          postal_code?: string | null
          telegram?: string | null
          updated_at?: string
          whatsapp?: string | null
          working_hours?: string
        }
        Update: {
          address?: string
          address_country?: string | null
          address_locality?: string | null
          address_region?: string | null
          created_at?: string
          email?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: number
          phone_primary?: string
          phone_secondary?: string | null
          postal_code?: string | null
          telegram?: string | null
          updated_at?: string
          whatsapp?: string | null
          working_hours?: string
        }
        Relationships: []
      }
      features: {
        Row: {
          created_at: string
          description: string
          icon_name: string
          id: number
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          icon_name?: string
          id?: number
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon_name?: string
          id?: number
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      footer_config: {
        Row: {
          background_color: string
          brand_display: string
          copyright_template: string
          created_at: string
          id: number
          tagline: string
          text_color: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          brand_display?: string
          copyright_template?: string
          created_at?: string
          id?: number
          tagline?: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          brand_display?: string
          copyright_template?: string
          created_at?: string
          id?: number
          tagline?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_settings: {
        Row: {
          alt_text: string | null
          background_image: string | null
          created_at: string
          cta_link: string
          cta_text: string
          headline_accent: string | null
          id: number
          is_active: boolean
          overlay_opacity: number
          secondary_cta_link: string | null
          secondary_cta_text: string | null
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          background_image?: string | null
          created_at?: string
          cta_link?: string
          cta_text?: string
          headline_accent?: string | null
          id?: number
          is_active?: boolean
          overlay_opacity?: number
          secondary_cta_link?: string | null
          secondary_cta_text?: string | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          background_image?: string | null
          created_at?: string
          cta_link?: string
          cta_text?: string
          headline_accent?: string | null
          id?: number
          is_active?: boolean
          overlay_opacity?: number
          secondary_cta_link?: string | null
          secondary_cta_text?: string | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: number
          interest: string | null
          ip_hash: string | null
          message: string | null
          name: string
          notes: string | null
          phone: string
          source: string | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: number
          interest?: string | null
          ip_hash?: string | null
          message?: string | null
          name: string
          notes?: string | null
          phone: string
          source?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: number
          interest?: string | null
          ip_hash?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string
          source?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      nav_items: {
        Row: {
          created_at: string
          href: string
          id: number
          is_active: boolean
          label: string
          sort_order: number
          target: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          href: string
          id?: number
          is_active?: boolean
          label: string
          sort_order?: number
          target?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          href?: string
          id?: number
          is_active?: boolean
          label?: string
          sort_order?: number
          target?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          badge: string | null
          category: string | null
          category_id: number | null
          created_at: string | null
          description: string | null
          id: number
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          price: string | null
          price_amount: number | null
          price_currency: string
          price_display: string | null
          slug: string | null
          sort_order: number
          title: string
          updated_at: string | null
        }
        Insert: {
          badge?: string | null
          category?: string | null
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          price?: string | null
          price_amount?: number | null
          price_currency?: string
          price_display?: string | null
          slug?: string | null
          sort_order?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          badge?: string | null
          category?: string | null
          category_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          price?: string | null
          price_amount?: number | null
          price_currency?: string
          price_display?: string | null
          slug?: string | null
          sort_order?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: number
          is_primary: boolean
          product_id: number
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: number
          is_primary?: boolean
          product_id: number
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: number
          is_primary?: boolean
          product_id?: number
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      typography_settings: {
        Row: {
          color: string | null
          element_key: string
          font_family: string | null
          font_size: string | null
          font_weight: string | null
          letter_spacing: string | null
          line_height: string | null
          scope: string
          text_align: string | null
          text_transform: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          element_key: string
          font_family?: string | null
          font_size?: string | null
          font_weight?: string | null
          letter_spacing?: string | null
          line_height?: string | null
          scope: string
          text_align?: string | null
          text_transform?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          element_key?: string
          font_family?: string | null
          font_size?: string | null
          font_weight?: string | null
          letter_spacing?: string | null
          line_height?: string | null
          scope?: string
          text_align?: string | null
          text_transform?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          created_at: string
          id: number
          ip_hash: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: number
          ip_hash: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: number
          ip_hash?: string
        }
        Relationships: []
      }
      site_config: {
        Row: {
          config_key: string
          config_value: string | null
          id: number
        }
        Insert: {
          config_key: string
          config_value?: string | null
          id?: number
        }
        Update: {
          config_key?: string
          config_value?: string | null
          id?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          canonical_url: string
          created_at: string
          enable_analytics: boolean
          id: number
          json_ld_override: Json | null
          maintenance_mode: boolean
          meta_keywords: string[]
          og_image_url: string | null
          rating_value: number | null
          review_count: number | null
          site_description: string
          site_name: string
          theme_color: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string
          created_at?: string
          enable_analytics?: boolean
          id?: number
          json_ld_override?: Json | null
          maintenance_mode?: boolean
          meta_keywords?: string[]
          og_image_url?: string | null
          rating_value?: number | null
          review_count?: number | null
          site_description?: string
          site_name?: string
          theme_color?: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string
          created_at?: string
          enable_analytics?: boolean
          id?: number
          json_ld_override?: Json | null
          maintenance_mode?: boolean
          meta_keywords?: string[]
          og_image_url?: string | null
          rating_value?: number | null
          review_count?: number | null
          site_description?: string
          site_name?: string
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          icon_name: string | null
          id: number
          is_active: boolean
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          icon_name?: string | null
          id?: number
          is_active?: boolean
          platform: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          icon_name?: string | null
          id?: number
          is_active?: boolean
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      theme_settings: {
        Row: {
          accent_color: string
          background_color: string
          border_radius: string
          created_at: string
          custom_css: string | null
          font_body: string
          font_heading: string
          foreground_color: string
          id: number
          primary_color: string
          primary_dark: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          border_radius?: string
          created_at?: string
          custom_css?: string | null
          font_body?: string
          font_heading?: string
          foreground_color?: string
          id?: number
          primary_color?: string
          primary_dark?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          border_radius?: string
          created_at?: string
          custom_css?: string | null
          font_body?: string
          font_heading?: string
          foreground_color?: string
          id?: number
          primary_color?: string
          primary_dark?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_owner: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
