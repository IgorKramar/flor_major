'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ImageUpload } from '@/components/admin/image-upload'
import { SectionSurfaceEditor } from '@/components/admin/section-surface-editor'
import { TypographyPanel } from '@/components/admin/typography-panel'
import { useTypographyEditor } from '@/lib/hooks/use-typography-editor'
import { revalidateSiteCache } from '@/lib/revalidate'
import { heroSchema } from '@/lib/validation/schemas'

interface HeroForm {
  title: string
  subtitle: string
  headline_accent: string
  cta_text: string
  cta_link: string
  secondary_cta_text: string
  secondary_cta_link: string
  background_image: string | null
  alt_text: string
  overlay_opacity: number
  is_active: boolean
}

const DEFAULTS: HeroForm = {
  title: '',
  subtitle: '',
  headline_accent: '',
  cta_text: 'Выбрать букет',
  cta_link: '#products',
  secondary_cta_text: '',
  secondary_cta_link: '',
  background_image: null,
  alt_text: '',
  overlay_opacity: 0.4,
  is_active: true,
}

const HERO_TYPO_KEYS = ['title', 'accent', 'subtitle', 'cta', 'secondary_cta'] as const

export default function HeroSettingsPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<HeroForm>(DEFAULTS)

  const typoEditor = useTypographyEditor({ scope: 'hero', elementKeys: HERO_TYPO_KEYS })

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('hero_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setSettings({
        title: data.title ?? '',
        subtitle: data.subtitle ?? '',
        headline_accent: data.headline_accent ?? '',
        cta_text: data.cta_text ?? 'Выбрать букет',
        cta_link: data.cta_link ?? '#products',
        secondary_cta_text: data.secondary_cta_text ?? '',
        secondary_cta_link: data.secondary_cta_link ?? '',
        background_image: data.background_image ?? null,
        alt_text: data.alt_text ?? '',
        overlay_opacity: data.overlay_opacity ?? 0.4,
        is_active: data.is_active ?? true,
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = heroSchema.safeParse({
      ...settings,
      headline_accent: settings.headline_accent || null,
      secondary_cta_text: settings.secondary_cta_text || null,
      secondary_cta_link: settings.secondary_cta_link || null,
      background_image: settings.background_image ?? '',
      alt_text: settings.alt_text || null,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('hero_settings')
        .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' })
      if (error) throw error

      const typoResult = await typoEditor.save()
      if (typoResult.errors.length) {
        typoResult.errors.forEach((m) => toast.error(m))
      }
      toast.success('Настройки hero сохранены')
      await revalidateSiteCache('/')
    } catch (error) {
      console.error(error)
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading || typoEditor.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
          Главная страница
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Настройка hero-секции: контент и типографика каждого блока
        </p>
      </div>

      <SectionSurfaceEditor sectionKey="hero" />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Заголовок</label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <TypographyPanel
              editor={typoEditor}
              elementKey="title"
              label="Заголовок"
              previewText={settings.title}
              onPreviewTextChange={(v) => setSettings({ ...settings, title: v })}
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Акцент в заголовке</label>
            <input
              type="text"
              value={settings.headline_accent}
              onChange={(e) => setSettings({ ...settings, headline_accent: e.target.value })}
              placeholder="Например: о чувствах"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <TypographyPanel
              editor={typoEditor}
              elementKey="accent"
              label="Акцент"
              previewText={settings.headline_accent}
              onPreviewTextChange={(v) => setSettings({ ...settings, headline_accent: v })}
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Подзаголовок</label>
            <textarea
              rows={3}
              value={settings.subtitle}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
            <TypographyPanel
              editor={typoEditor}
              elementKey="subtitle"
              label="Подзаголовок"
              previewText={settings.subtitle}
              onPreviewTextChange={(v) => setSettings({ ...settings, subtitle: v })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст главной кнопки
              </label>
              <input
                type="text"
                value={settings.cta_text}
                onChange={(e) => setSettings({ ...settings, cta_text: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ссылка главной кнопки
              </label>
              <input
                type="text"
                value={settings.cta_link}
                onChange={(e) => setSettings({ ...settings, cta_link: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>
          <TypographyPanel
            editor={typoEditor}
            elementKey="cta"
            label="Главная кнопка"
            previewText={settings.cta_text}
            onPreviewTextChange={(v) => setSettings({ ...settings, cta_text: v })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст второй кнопки
              </label>
              <input
                type="text"
                value={settings.secondary_cta_text}
                onChange={(e) =>
                  setSettings({ ...settings, secondary_cta_text: e.target.value })
                }
                placeholder="Позвонить"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ссылка второй кнопки
              </label>
              <input
                type="text"
                value={settings.secondary_cta_link}
                onChange={(e) =>
                  setSettings({ ...settings, secondary_cta_link: e.target.value })
                }
                placeholder="tel:+7..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>
          <TypographyPanel
            editor={typoEditor}
            elementKey="secondary_cta"
            label="Вторая кнопка"
            previewText={settings.secondary_cta_text}
            onPreviewTextChange={(v) => setSettings({ ...settings, secondary_cta_text: v })}
          />

          <ImageUpload
            value={settings.background_image}
            onChange={(url) => setSettings({ ...settings, background_image: url })}
            folder="hero"
            label="Фоновое изображение"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alt для изображения
              </label>
              <input
                type="text"
                value={settings.alt_text}
                onChange={(e) => setSettings({ ...settings, alt_text: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Затемнение фона ({Math.round(settings.overlay_opacity * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.overlay_opacity}
                onChange={(e) =>
                  setSettings({ ...settings, overlay_opacity: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.is_active ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">Секция активна</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving
              ? 'Сохранение...'
              : `Сохранить${typoEditor.dirtyCount > 0 ? ` (типо: ${typoEditor.dirtyCount})` : ''}`}
          </button>
        </div>
      </form>
    </div>
  )
}
