'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ImageUpload } from '@/components/admin/image-upload'
import { TypographySection } from '@/components/admin/typography-section'
import { revalidateSiteCache } from '@/lib/revalidate'
import {
  thanksPageSettingsSchema,
  type ThanksPageSettingsInput,
} from '@/lib/validation/schemas'

type ThanksForm = Omit<ThanksPageSettingsInput, 'image_url'> & {
  image_url: string | null
}

const DEFAULTS: ThanksForm = {
  is_active: true,
  heading: 'Спасибо за заявку!',
  subheading: 'Мы свяжемся с вами в ближайшее время',
  body_text:
    'Наш флорист уже изучает ваш заказ и скоро перезвонит, чтобы уточнить детали и помочь с выбором.',
  image_url: null,
  image_alt: 'Благодарность',
  show_phone: true,
  button_text: 'Вернуться на главную',
  button_link: '/',
}

export default function ThanksAdmin() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ThanksForm>(DEFAULTS)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('thanks_page_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setForm({
        is_active: data.is_active,
        heading: data.heading,
        subheading: data.subheading,
        body_text: data.body_text,
        image_url: data.image_url ?? null,
        image_alt: data.image_alt,
        show_phone: data.show_phone,
        button_text: data.button_text,
        button_link: data.button_link,
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = thanksPageSettingsSchema.safeParse({
      ...form,
      image_url: form.image_url || null,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('thanks_page_settings')
      .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' })
    if (error) {
      toast.error('Ошибка сохранения')
    } else {
      toast.success('Сохранено')
      await revalidateSiteCache('/thanks')
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
    <div className="space-y-6 pb-32">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
          Страница «Спасибо»
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Показывается после отправки лид-формы по адресу /thanks
        </p>
      </div>

      <TypographySection scope="thanks_page" revalidatePaths={['/thanks']} />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <label className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_active ? 'bg-primary' : 'bg-gray-200'
              }`}
              aria-pressed={form.is_active}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">
              Включить редирект на /thanks после отправки формы
            </span>
          </label>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Тексты</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок
            </label>
            <input
              type="text"
              value={form.heading}
              onChange={(e) => setForm({ ...form, heading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Подзаголовок
            </label>
            <input
              type="text"
              value={form.subheading}
              onChange={(e) => setForm({ ...form, subheading: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Основной текст
            </label>
            <textarea
              rows={3}
              value={form.body_text}
              onChange={(e) => setForm({ ...form, body_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Изображение</h2>
          <ImageUpload
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            folder="thanks"
            label="Иллюстрация"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alt-текст
            </label>
            <input
              type="text"
              value={form.image_alt}
              onChange={(e) => setForm({ ...form, image_alt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Кнопка</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текст
            </label>
            <input
              type="text"
              value={form.button_text}
              onChange={(e) => setForm({ ...form, button_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ссылка
            </label>
            <input
              type="text"
              value={form.button_link}
              onChange={(e) => setForm({ ...form, button_link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.show_phone}
              onChange={(e) => setForm({ ...form, show_phone: e.target.checked })}
            />
            <span className="text-sm">Показывать телефон из раздела «Контакты»</span>
          </label>
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
