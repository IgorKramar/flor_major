'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { TypographySection } from '@/components/admin/typography-section'
import { revalidateSiteCache } from '@/lib/revalidate'
import {
  catalogPageSettingsSchema,
  type CatalogPageSettingsInput,
} from '@/lib/validation/schemas'

const DEFAULTS: CatalogPageSettingsInput = {
  heading: 'Каталог товаров',
  subheading: 'Все наши композиции в одном месте',
  search_placeholder: 'Поиск по названию, описанию, категории…',
  filter_label: 'Категории',
  sort_label: 'Сортировка',
  sort_default_label: 'Без сортировки',
  sort_asc_label: 'Цена: по возрастанию',
  sort_desc_label: 'Цена: по убыванию',
  empty_state_text: 'Ничего не найдено. Попробуйте другой запрос или сбросьте фильтры.',
  cta_card_text: 'Подробнее',
  show_breadcrumbs: true,
}

export default function CatalogPageAdmin() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CatalogPageSettingsInput>(DEFAULTS)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('catalog_page_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setForm({
        heading: data.heading,
        subheading: data.subheading ?? '',
        search_placeholder: data.search_placeholder,
        filter_label: data.filter_label,
        sort_label: data.sort_label,
        sort_default_label: data.sort_default_label,
        sort_asc_label: data.sort_asc_label,
        sort_desc_label: data.sort_desc_label,
        empty_state_text: data.empty_state_text,
        cta_card_text: data.cta_card_text,
        show_breadcrumbs: data.show_breadcrumbs,
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = catalogPageSettingsSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('catalog_page_settings')
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
          Страница каталога
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Настройка текстов, фильтров и типографики страницы /catalog
        </p>
      </div>

      <TypographySection scope="catalog_page" revalidatePaths={['/catalog']} />

      <form onSubmit={handleSave} className="space-y-6">
        <Card title="Заголовок и описание">
          <Field
            label="Заголовок"
            value={form.heading}
            onChange={(v) => setForm({ ...form, heading: v })}
          />
          <Field
            label="Подзаголовок"
            value={form.subheading}
            onChange={(v) => setForm({ ...form, subheading: v })}
          />
        </Card>

        <Card title="Фильтры и поиск">
          <Field
            label="Текст-подсказка в поиске"
            value={form.search_placeholder}
            onChange={(v) => setForm({ ...form, search_placeholder: v })}
          />
          <Field
            label="Подпись фильтра категорий"
            value={form.filter_label}
            onChange={(v) => setForm({ ...form, filter_label: v })}
          />
          <Field
            label="Подпись сортировки"
            value={form.sort_label}
            onChange={(v) => setForm({ ...form, sort_label: v })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="«Без сортировки»"
              value={form.sort_default_label}
              onChange={(v) => setForm({ ...form, sort_default_label: v })}
            />
            <Field
              label="«Цена: по возрастанию»"
              value={form.sort_asc_label}
              onChange={(v) => setForm({ ...form, sort_asc_label: v })}
            />
            <Field
              label="«Цена: по убыванию»"
              value={form.sort_desc_label}
              onChange={(v) => setForm({ ...form, sort_desc_label: v })}
            />
          </div>
        </Card>

        <Card title="Карточки и состояния">
          <Field
            label="Текст кнопки в карточке"
            value={form.cta_card_text}
            onChange={(v) => setForm({ ...form, cta_card_text: v })}
          />
          <Field
            label="Текст при пустом результате"
            value={form.empty_state_text}
            onChange={(v) => setForm({ ...form, empty_state_text: v })}
            textarea
          />
        </Card>

        <Card title="Layout">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.show_breadcrumbs}
              onChange={(e) =>
                setForm({ ...form, show_breadcrumbs: e.target.checked })
              }
            />
            <span className="text-sm">Показывать «хлебные крошки»</span>
          </label>
        </Card>

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  textarea?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        />
      )}
    </div>
  )
}
