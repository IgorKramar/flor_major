'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { IconPicker } from '@/components/admin/icon-picker'
import { revalidateSiteCache } from '@/lib/revalidate'
import { categorySchema } from '@/lib/validation/schemas'
import type { Tables } from '@/lib/database.types'
import { getIcon } from '@/lib/icons'

type Category = Tables<'categories'>

interface FormState {
  slug: string
  name: string
  description: string
  icon_name: string
  sort_order: string
  show_on_home: boolean
  is_active: boolean
}

const EMPTY: FormState = {
  slug: '',
  name: '',
  description: '',
  icon_name: 'Flower2',
  sort_order: '0',
  show_on_home: true,
  is_active: true,
}

export default function CategoriesPage() {
  const { supabase } = useAuth()
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  const load = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
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

  function openEdit(item: Category) {
    setEditingId(item.id)
    setForm({
      slug: item.slug,
      name: item.name,
      description: item.description ?? '',
      icon_name: item.icon_name ?? 'Flower2',
      sort_order: String(item.sort_order ?? 0),
      show_on_home: item.show_on_home,
      is_active: item.is_active,
    })
    setModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const parsed = categorySchema.safeParse({
      ...form,
      description: form.description || null,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    const result = editingId
      ? await supabase.from('categories').update(parsed.data).eq('id', editingId)
      : await supabase.from('categories').insert(parsed.data)
    if (result.error) {
      toast.error('Ошибка сохранения')
      return
    }
    toast.success(editingId ? 'Категория обновлена' : 'Категория создана')
    setModal(false)
    await revalidateSiteCache('/')
    load()
  }

  async function remove(id: number) {
    if (!confirm('Удалить категорию?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Категории</h1>
          <p className="text-gray-600 mt-1">Каталожные разделы на главной странице</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800"
        >
          <Plus className="w-5 h-5" />
          Добавить
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Иконка
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Название
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Порядок
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                На главной
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Активна
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => {
              const Icon = getIcon(item.icon_name)
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500">{item.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.slug}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.sort_order}</td>
                  <td className="px-4 py-3">
                    {item.show_on_home ? '✓' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {item.is_active ? '✓' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={save} className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">
                {editingId ? 'Редактировать категорию' : 'Новая категория'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="bouquets"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <IconPicker
                value={form.icon_name}
                onChange={(icon) => setForm({ ...form, icon_name: icon })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  rows={2}
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

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.show_on_home}
                    onChange={(e) => setForm({ ...form, show_on_home: e.target.checked })}
                  />
                  <span className="text-sm">Показывать на главной</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <span className="text-sm">Активна</span>
                </label>
              </div>

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
