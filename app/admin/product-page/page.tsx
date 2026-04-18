'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { TypographySection } from '@/components/admin/typography-section'
import { revalidateSiteCache } from '@/lib/revalidate'
import {
  productPageSettingsSchema,
  type ProductPageSettingsInput,
} from '@/lib/validation/schemas'

const DEFAULTS: ProductPageSettingsInput = {
  show_breadcrumbs: true,
  show_category_meta: true,
  cta_primary_text: 'Заказать',
  cta_primary_link: '/#contact',
  show_phone_cta: true,
  show_similar_products: false,
  similar_products_heading: 'Похожие товары',
  similar_products_limit: 4,
}

export default function ProductPageAdmin() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProductPageSettingsInput>(DEFAULTS)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('product_page_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setForm({
        show_breadcrumbs: data.show_breadcrumbs,
        show_category_meta: data.show_category_meta,
        cta_primary_text: data.cta_primary_text,
        cta_primary_link: data.cta_primary_link,
        show_phone_cta: data.show_phone_cta,
        show_similar_products: data.show_similar_products,
        similar_products_heading: data.similar_products_heading,
        similar_products_limit: data.similar_products_limit,
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = productPageSettingsSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('product_page_settings')
      .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' })
    if (error) {
      toast.error('Ошибка сохранения')
    } else {
      toast.success('Сохранено')
      await revalidateSiteCache('/catalog')
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
          Страница товара
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Настройка разметки /catalog/[slug] и типографики
        </p>
      </div>

      <TypographySection scope="product_page" revalidatePaths={['/catalog']} />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Layout</h2>
          <Toggle
            label="Показывать «хлебные крошки»"
            value={form.show_breadcrumbs}
            onChange={(v) => setForm({ ...form, show_breadcrumbs: v })}
          />
          <Toggle
            label="Показывать категорию товара"
            value={form.show_category_meta}
            onChange={(v) => setForm({ ...form, show_category_meta: v })}
          />
          <Toggle
            label="Показывать блок «Позвонить»"
            value={form.show_phone_cta}
            onChange={(v) => setForm({ ...form, show_phone_cta: v })}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Основная кнопка</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текст кнопки
            </label>
            <input
              type="text"
              value={form.cta_primary_text}
              onChange={(e) =>
                setForm({ ...form, cta_primary_text: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ссылка
            </label>
            <input
              type="text"
              value={form.cta_primary_link}
              onChange={(e) =>
                setForm({ ...form, cta_primary_link: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Похожие товары</h2>
          <Toggle
            label="Показывать блок «Похожие товары»"
            value={form.show_similar_products}
            onChange={(v) => setForm({ ...form, show_similar_products: v })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок блока
            </label>
            <input
              type="text"
              value={form.similar_products_heading}
              onChange={(e) =>
                setForm({ ...form, similar_products_heading: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сколько показывать (1–12)
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.similar_products_limit}
              onChange={(e) =>
                setForm({
                  ...form,
                  similar_products_limit: Number(e.target.value) || 4,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
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
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-primary' : 'bg-gray-200'
        }`}
        aria-pressed={value}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
