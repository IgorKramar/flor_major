'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Save, Palette } from 'lucide-react'

interface AppearanceSettings {
  primaryColor: string
  primaryDark: string
  accentColor: string
  fontFamilyHeading: string
  fontFamilyBody: string
  borderRadius: string
}

export default function AppearancePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AppearanceSettings>({
    primaryColor: '#c89f9f',
    primaryDark: '#a87f7f',
    accentColor: '#f5e6e0',
    fontFamilyHeading: 'Cormorant Garamond',
    fontFamilyBody: 'Montserrat',
    borderRadius: '0.75rem',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const { data, error } = await supabase.from('site_config').select('*')

      if (error) throw error

      if (data && data.length > 0) {
        const configObj: Record<string, string> = {}
        data.forEach((row: { config_key: string; config_value: string }) => {
          configObj[row.config_key] = row.config_value
        })

        setSettings({
          primaryColor: configObj['primary_color'] || settings.primaryColor,
          primaryDark: configObj['primary_dark'] || settings.primaryDark,
          accentColor: configObj['accent_color'] || settings.accentColor,
          fontFamilyHeading: configObj['font_heading'] || settings.fontFamilyHeading,
          fontFamilyBody: configObj['font_body'] || settings.fontFamilyBody,
          borderRadius: configObj['border_radius'] || settings.borderRadius,
        })
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const updates = [
        { config_key: 'primary_color', config_value: settings.primaryColor },
        { config_key: 'primary_dark', config_value: settings.primaryDark },
        { config_key: 'accent_color', config_value: settings.accentColor },
        { config_key: 'font_heading', config_value: settings.fontFamilyHeading },
        { config_key: 'font_body', config_value: settings.fontFamilyBody },
        { config_key: 'border_radius', config_value: settings.borderRadius },
      ]

      for (const update of updates) {
        const { error } = await supabase.from('site_config').upsert(update, {
          onConflict: 'config_key',
        })
        if (error) throw error
      }

      toast.success('Настройки внешнего вида сохранены')
    } catch (error) {
      console.error('Error saving appearance settings:', error)
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Внешний вид</h1>
        <p className="text-gray-600 mt-1">Настройка цветов и стилей сайта</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Colors */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Цвета</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Основной цвет
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Темный основной цвет
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.primaryDark}
                  onChange={(e) => setSettings({ ...settings, primaryDark: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryDark}
                  onChange={(e) => setSettings({ ...settings, primaryDark: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Акцентный цвет
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Typography & Borders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Типографика и границы</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Шрифт заголовков
              </label>
              <select
                value={settings.fontFamilyHeading}
                onChange={(e) => setSettings({ ...settings, fontFamilyHeading: e.target.value })}
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
                value={settings.fontFamilyBody}
                onChange={(e) => setSettings({ ...settings, fontFamilyBody: e.target.value })}
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
                value={settings.borderRadius}
                onChange={(e) => setSettings({ ...settings, borderRadius: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="0">Без скругления</option>
                <option value="0.25rem">Маленький (4px)</option>
                <option value="0.5rem">Средний (8px)</option>
                <option value="0.75rem">Большой (12px)</option>
                <option value="1rem">Очень большой (16px)</option>
                <option value="1.5rem">Максимальный (24px)</option>
                <option value="9999px">Полный круг</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Предпросмотр</h2>
          <div className="space-y-4">
            {/* Color Swatches */}
            <div className="flex gap-4">
              <div
                className="w-20 h-20 rounded-lg shadow-md"
                style={{ backgroundColor: settings.primaryColor }}
              >
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-medium">
                  Primary
                </div>
              </div>
              <div
                className="w-20 h-20 rounded-lg shadow-md"
                style={{ backgroundColor: settings.primaryDark }}
              >
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-medium">
                  Dark
                </div>
              </div>
              <div
                className="w-20 h-20 rounded-lg shadow-md"
                style={{ backgroundColor: settings.accentColor }}
              >
                <div className="w-full h-full flex items-center justify-center text-gray-800 text-xs font-medium">
                  Accent
                </div>
              </div>
            </div>

            {/* Typography Preview */}
            <div className="pt-4 border-t border-gray-200">
              <h3
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: settings.fontFamilyHeading }}
              >
                Заголовок в стиле {settings.fontFamilyHeading}
              </h3>
              <p
                className="text-gray-600"
                style={{ fontFamily: settings.fontFamilyBody }}
              >
                Пример текста в стиле {settings.fontFamilyBody}. Этот шрифт будет использоваться для основного контента сайта.
              </p>
            </div>

            {/* Border Radius Preview */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Пример кнопок:</p>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 text-white text-sm font-medium"
                  style={{
                    backgroundColor: settings.primaryColor,
                    borderRadius: settings.borderRadius,
                  }}
                >
                  Кнопка
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium border-2"
                  style={{
                    borderColor: settings.primaryColor,
                    color: settings.primaryColor,
                    borderRadius: settings.borderRadius,
                  }}
                >
                  Контурная
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
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
