'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save, Bell, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { revalidateSiteCache } from '@/lib/revalidate'

export default function SettingsPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enableAnalytics, setEnableAnalytics] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('enable_analytics, maintenance_mode')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setEnableAnalytics(data.enable_analytics ?? true)
      setMaintenanceMode(data.maintenance_mode ?? false)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('site_settings')
      .update({
        enable_analytics: enableAnalytics,
        maintenance_mode: maintenanceMode,
      })
      .eq('id', 1)
    if (error) {
      toast.error('Ошибка сохранения')
    } else {
      toast.success('Настройки сохранены')
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
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">
          Настройки сайта
        </h1>
        <p className="text-gray-600 mt-1">Общие параметры работы сайта</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Функции</h2>
            </div>

            <Toggle
              label="Аналитика"
              description="Vercel Analytics и Speed Insights"
              checked={enableAnalytics}
              onChange={setEnableAnalytics}
            />

            <Toggle
              label="Режим обслуживания"
              description="Публичные страницы будут заменены на заглушку"
              checked={maintenanceMode}
              onChange={setMaintenanceMode}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Информация</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">SEO и мета-теги:</span>
                <a href="/admin/seo" className="font-medium text-primary">
                  /admin/seo
                </a>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Внешний вид:</span>
                <a href="/admin/appearance" className="font-medium text-primary">
                  /admin/appearance
                </a>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Футер:</span>
                <a href="/admin/footer" className="font-medium text-primary">
                  /admin/footer
                </a>
              </div>
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

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
