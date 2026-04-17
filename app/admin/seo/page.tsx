'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ImageUpload } from '@/components/admin/image-upload'
import { revalidateSiteCache } from '@/lib/revalidate'
import { siteSettingsSchema } from '@/lib/validation/schemas'

interface SeoForm {
  site_name: string
  site_description: string
  meta_keywords: string
  og_image_url: string | null
  canonical_url: string
  theme_color: string
  rating_value: string
  review_count: string
}

const DEFAULTS: SeoForm = {
  site_name: '',
  site_description: '',
  meta_keywords: '',
  og_image_url: null,
  canonical_url: 'https://flormajor.ru',
  theme_color: '#c89f9f',
  rating_value: '4.9',
  review_count: '132',
}

export default function SeoPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SeoForm>(DEFAULTS)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setForm({
        site_name: data.site_name,
        site_description: data.site_description,
        meta_keywords: Array.isArray(data.meta_keywords)
          ? data.meta_keywords.join(', ')
          : '',
        og_image_url: data.og_image_url ?? null,
        canonical_url: data.canonical_url,
        theme_color: data.theme_color,
        rating_value: data.rating_value != null ? String(data.rating_value) : '',
        review_count: data.review_count != null ? String(data.review_count) : '',
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const keywords = form.meta_keywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const parsed = siteSettingsSchema.safeParse({
      site_name: form.site_name,
      site_description: form.site_description,
      meta_keywords: keywords,
      og_image_url: form.og_image_url ?? '',
      canonical_url: form.canonical_url,
      theme_color: form.theme_color,
      enable_analytics: true,
      maintenance_mode: false,
      rating_value: form.rating_value || null,
      review_count: form.review_count || null,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    const toUpdate = {
      site_name: parsed.data.site_name,
      site_description: parsed.data.site_description,
      meta_keywords: parsed.data.meta_keywords,
      og_image_url: parsed.data.og_image_url,
      canonical_url: parsed.data.canonical_url,
      theme_color: parsed.data.theme_color,
      rating_value: parsed.data.rating_value ?? null,
      review_count: parsed.data.review_count ?? null,
    }
    const { error } = await supabase
      .from('site_settings')
      .update(toUpdate)
      .eq('id', 1)
    if (error) {
      toast.error('Ошибка сохранения')
    } else {
      toast.success('SEO сохранено')
      await revalidateSiteCache('/')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">SEO и мета</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Управление мета-тегами и Open Graph</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название сайта *
            </label>
            <input
              type="text"
              required
              value={form.site_name}
              onChange={(e) => setForm({ ...form, site_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta-описание *
            </label>
            <textarea
              rows={3}
              required
              value={form.site_description}
              onChange={(e) =>
                setForm({ ...form, site_description: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ключевые слова (через запятую)
            </label>
            <input
              type="text"
              value={form.meta_keywords}
              onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canonical URL *
            </label>
            <input
              type="url"
              required
              value={form.canonical_url}
              onChange={(e) => setForm({ ...form, canonical_url: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Theme color (PWA)
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={form.theme_color}
                onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={form.theme_color}
                onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          <ImageUpload
            value={form.og_image_url}
            onChange={(url) => setForm({ ...form, og_image_url: url })}
            folder="og"
            label="OG-изображение (для соцсетей)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Рейтинг (для JSON-LD)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating_value}
                onChange={(e) => setForm({ ...form, rating_value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество отзывов
              </label>
              <input
                type="number"
                min="0"
                value={form.review_count}
                onChange={(e) => setForm({ ...form, review_count: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}
