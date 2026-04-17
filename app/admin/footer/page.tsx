'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { revalidateSiteCache } from '@/lib/revalidate'
import { footerSchema } from '@/lib/validation/schemas'

interface FooterForm {
  brand_display: string
  tagline: string
  copyright_template: string
  background_color: string
  text_color: string
}

const DEFAULTS: FooterForm = {
  brand_display: 'ФЛОР МАЖОР',
  tagline: 'Создаем настроение цветами',
  copyright_template: '© {{year}} Флор Мажор. Все права защищены.',
  background_color: '#1a1a1a',
  text_color: '#ffffff',
}

export default function FooterPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FooterForm>(DEFAULTS)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('footer_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setForm({
        brand_display: data.brand_display,
        tagline: data.tagline,
        copyright_template: data.copyright_template,
        background_color: data.background_color,
        text_color: data.text_color,
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = footerSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('footer_config')
      .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' })
    if (error) {
      toast.error('Ошибка сохранения')
    } else {
      toast.success('Футер сохранён')
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
        <h1 className="text-3xl font-serif font-bold text-gray-900">Футер</h1>
        <p className="text-gray-600 mt-1">Настройка нижней части сайта</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название бренда (в футере)
            </label>
            <input
              type="text"
              value={form.brand_display}
              onChange={(e) => setForm({ ...form, brand_display: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Слоган
            </label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Шаблон копирайта (используйте {`{{year}}`})
            </label>
            <input
              type="text"
              value={form.copyright_template}
              onChange={(e) =>
                setForm({ ...form, copyright_template: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фон
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={form.background_color}
                  onChange={(e) =>
                    setForm({ ...form, background_color: e.target.value })
                  }
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.background_color}
                  onChange={(e) =>
                    setForm({ ...form, background_color: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Текст
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
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
