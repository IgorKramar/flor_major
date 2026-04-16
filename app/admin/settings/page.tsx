'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Save, Globe, Shield, Bell } from 'lucide-react'

interface GeneralSettings {
  siteName: string
  siteDescription: string
  metaKeywords: string
  enableAnalytics: boolean
  maintenanceMode: boolean
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<GeneralSettings>({
    siteName: 'Флор Мажор',
    siteDescription: 'Магазин цветов в Омске — свежие букеты, авторские композиции и доставка',
    metaKeywords: 'цветы омск, доставка цветов, букеты, розы',
    enableAnalytics: true,
    maintenanceMode: false,
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
          siteName: configObj['site_name'] || settings.siteName,
          siteDescription: configObj['site_description'] || settings.siteDescription,
          metaKeywords: configObj['meta_keywords'] || settings.metaKeywords,
          enableAnalytics: configObj['enable_analytics'] !== 'false',
          maintenanceMode: configObj['maintenance_mode'] === 'true',
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const updates = [
        { config_key: 'site_name', config_value: settings.siteName },
        { config_key: 'site_description', config_value: settings.siteDescription },
        { config_key: 'meta_keywords', config_value: settings.metaKeywords },
        { config_key: 'enable_analytics', config_value: settings.enableAnalytics.toString() },
        { config_key: 'maintenance_mode', config_value: settings.maintenanceMode.toString() },
      ]

      for (const update of updates) {
        const { error } = await supabase.from('site_config').upsert(update, {
          onConflict: 'config_key',
        })
        if (error) throw error
      }

      toast.success('Настройки сохранены')
    } catch (error) {
      console.error('Error saving settings:', error)
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
        <h1 className="text-3xl font-serif font-bold text-gray-900">Настройки сайта</h1>
        <p className="text-gray-600 mt-1">Общие параметры конфигурации</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Основные настройки</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название сайта
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta описание
                </label>
                <input
                  type="text"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta ключевые слова
              </label>
              <textarea
                rows={3}
                value={settings.metaKeywords}
                onChange={(e) => setSettings({ ...settings, metaKeywords: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                placeholder="Разделяйте запятыми"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Функции</h2>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Аналитика</p>
                <p className="text-sm text-gray-500">Vercel Analytics</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, enableAnalytics: !settings.enableAnalytics })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enableAnalytics ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enableAnalytics ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Режим обслуживания</p>
                <p className="text-sm text-gray-500">Сайт недоступен для посетителей</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Информация</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Версия CMS:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Последнее обновление:</span>
                <span className="font-medium">{new Date().toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">База данных:</span>
                <span className="font-medium text-green-600">Подключено</span>
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
