'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save, Palette } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { revalidateSiteCache } from '@/lib/revalidate'
import { themeSchema } from '@/lib/validation/schemas'

interface ThemeForm {
  primary_color: string
  primary_dark: string
  accent_color: string
  background_color: string
  foreground_color: string
  font_heading: string
  font_body: string
  border_radius: string
  custom_css: string
}

const DEFAULTS: ThemeForm = {
  primary_color: '#c89f9f',
  primary_dark: '#a87f7f',
  accent_color: '#f5e6e0',
  background_color: '#ffffff',
  foreground_color: '#1a1a1a',
  font_heading: 'Cormorant Garamond',
  font_body: 'Montserrat',
  border_radius: '0.75rem',
  custom_css: '',
}

export default function AppearancePage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<ThemeForm>(DEFAULTS)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('theme_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setSettings({
        primary_color: data.primary_color,
        primary_dark: data.primary_dark,
        accent_color: data.accent_color,
        background_color: data.background_color,
        foreground_color: data.foreground_color,
        font_heading: data.font_heading,
        font_body: data.font_body,
        border_radius: data.border_radius,
        custom_css: data.custom_css ?? '',
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = themeSchema.safeParse({
      ...settings,
      custom_css: settings.custom_css || null,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('theme_settings')
        .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' })
      if (error) throw error
      toast.success('Настройки внешнего вида сохранены')
      await revalidateSiteCache('/')
    } catch (error) {
      console.error(error)
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
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
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
          Внешний вид
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Цвета, шрифты и пользовательский CSS</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Цвета</h2>
            </div>
            {(
              [
                ['primary_color', 'Основной цвет'],
                ['primary_dark', 'Тёмный основной'],
                ['accent_color', 'Акцент'],
                ['background_color', 'Фон'],
                ['foreground_color', 'Текст'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={settings[key]}
                    onChange={(e) =>
                      setSettings({ ...settings, [key]: e.target.value })
                    }
                    className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings[key]}
                    onChange={(e) =>
                      setSettings({ ...settings, [key]: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Типографика
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Шрифт заголовков
              </label>
              <select
                value={settings.font_heading}
                onChange={(e) =>
                  setSettings({ ...settings, font_heading: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="Cormorant Garamond">Cormorant Garamond</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Merriweather">Merriweather</option>
                <option value="Lora">Lora</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Шрифт текста
              </label>
              <select
                value={settings.font_body}
                onChange={(e) =>
                  setSettings({ ...settings, font_body: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="Montserrat">Montserrat</option>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Радиус скругления
              </label>
              <select
                value={settings.border_radius}
                onChange={(e) =>
                  setSettings({ ...settings, border_radius: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="0">Без скругления</option>
                <option value="0.25rem">4px</option>
                <option value="0.5rem">8px</option>
                <option value="0.75rem">12px</option>
                <option value="1rem">16px</option>
                <option value="1.5rem">24px</option>
                <option value="9999px">Круг</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пользовательский CSS
              </label>
              <textarea
                rows={6}
                value={settings.custom_css}
                onChange={(e) =>
                  setSettings({ ...settings, custom_css: e.target.value })
                }
                placeholder="/* Добавьте свои стили здесь */"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
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
