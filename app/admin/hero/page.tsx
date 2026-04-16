'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

interface HeroSettings {
  id: number
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
  background_image?: string
  is_active: boolean
}

export default function HeroSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<HeroSettings>({
    id: 1,
    title: 'Цветы, которые говорят о чувствах',
    subtitle: 'Свежие букеты, авторские композиции и взрослые горшечные растения самовывозом и с доставкой по Омску. Создаём настроение более 10 лет.',
    cta_text: 'Выбрать букет',
    cta_link: '#bouquets',
    background_image: '',
    is_active: true,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('hero_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading hero settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('hero_settings')
        .upsert({ ...settings, id: 1 })

      if (error) throw error
      toast.success('Настройки главной страницы сохранены')
    } catch (error) {
      console.error('Error saving hero settings:', error)
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
        <h1 className="text-3xl font-serif font-bold text-gray-900">Главная страница</h1>
        <p className="text-gray-600 mt-1">Настройка-hero секции сайта</p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок
            </label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подзаголовок
            </label>
            <textarea
              rows={3}
              value={settings.subtitle}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* CTA Text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст кнопки
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
                Ссылка кнопки
              </label>
              <input
                type="text"
                value={settings.cta_link}
                onChange={(e) => setSettings({ ...settings, cta_link: e.target.value })}
                placeholder="#bouquets"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Background Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL фонового изображения
            </label>
            <input
              type="url"
              value={settings.background_image || ''}
              onChange={(e) => setSettings({ ...settings, background_image: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            {settings.background_image && (
              <div className="mt-4 relative h-48 rounded-lg overflow-hidden">
                <img
                  src={settings.background_image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Active Toggle */}
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
            <span className="text-sm font-medium text-gray-700">
              Секция активна
            </span>
          </div>
        </div>

        {/* Preview Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Предпросмотр</h2>
          <div
            className="relative rounded-xl overflow-hidden h-64"
            style={{
              background: settings.background_image
                ? `linear-gradient(120deg, var(--background) 40%, var(--accent) 100%), url(${settings.background_image})`
                : 'linear-gradient(120deg, var(--background) 40%, var(--accent) 100%)',
              backgroundSize: 'cover',
            }}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="p-8 max-w-lg">
                <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                  {settings.title}
                </h3>
                <p className="text-gray-600 mb-4">{settings.subtitle}</p>
                <button className="px-6 py-2 bg-primary text-white rounded-full text-sm font-medium">
                  {settings.cta_text}
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
