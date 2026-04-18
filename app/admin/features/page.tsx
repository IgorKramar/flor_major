'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { IconPicker } from '@/components/admin/icon-picker'
import { SectionSurfaceEditor } from '@/components/admin/section-surface-editor'
import { TypographySection } from '@/components/admin/typography-section'
import { revalidateSiteCache } from '@/lib/revalidate'
import { featureSchema } from '@/lib/validation/schemas'
import { getIcon } from '@/lib/icons'
import type { Tables } from '@/lib/database.types'

type Feature = Tables<'features'>

interface FormState {
  icon_name: string
  title: string
  description: string
  sort_order: string
  is_active: boolean
}

const EMPTY: FormState = {
  icon_name: 'Sparkles',
  title: '',
  description: '',
  sort_order: '0',
  is_active: true,
}

export default function FeaturesPage() {
  const { supabase } = useAuth()
  const [items, setItems] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  const load = useCallback(async () => {
    const { data } = await supabase.from('features').select('*').order('sort_order')
    setItems(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditingId(null)
    setForm(EMPTY)
    setModal(true)
  }

  function openEdit(item: Feature) {
    setEditingId(item.id)
    setForm({
      icon_name: item.icon_name,
      title: item.title,
      description: item.description,
      sort_order: String(item.sort_order ?? 0),
      is_active: item.is_active,
    })
    setModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const parsed = featureSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    const result = editingId
      ? await supabase.from('features').update(parsed.data).eq('id', editingId)
      : await supabase.from('features').insert(parsed.data)
    if (result.error) {
      toast.error('Ошибка сохранения')
      return
    }
    toast.success(editingId ? 'Сохранено' : 'Создано')
    setModal(false)
    await revalidateSiteCache('/')
    load()
  }

  async function remove(id: number) {
    if (!confirm('Удалить преимущество?')) return
    const { error } = await supabase.from('features').delete().eq('id', id)
    if (error) {
      toast.error('Ошибка удаления')
      return
    }
    toast.success('Удалено')
    await revalidateSiteCache('/')
    load()
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
            Преимущества
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Блок «Почему нас выбирают»</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Добавить
        </button>
      </div>

      <SectionSurfaceEditor sectionKey="features" />

      <TypographySection scope="features" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = getIcon(item.icon_name)
          return (
            <div
              key={item.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
              <div className="text-xs text-gray-400 flex gap-3">
                <span>Порядок: {item.sort_order}</span>
                <span>{item.is_active ? 'Активно' : 'Скрыто'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={save} className="p-5 sm:p-6 space-y-4">
              <h2 className="text-2xl font-bold">
                {editingId ? 'Редактировать' : 'Новое преимущество'}
              </h2>

              <IconPicker
                value={form.icon_name}
                onChange={(icon) => setForm({ ...form, icon_name: icon })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заголовок *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание *
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span className="text-sm">Активно</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  {editingId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
