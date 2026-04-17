'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { revalidateSiteCache } from '@/lib/revalidate'
import { navItemSchema } from '@/lib/validation/schemas'
import type { Tables } from '@/lib/database.types'

type NavItem = Tables<'nav_items'>

interface FormState {
  label: string
  href: string
  target: '_self' | '_blank'
  sort_order: string
  is_active: boolean
}

const EMPTY: FormState = {
  label: '',
  href: '',
  target: '_self',
  sort_order: '0',
  is_active: true,
}

export default function NavigationPage() {
  const { supabase } = useAuth()
  const [items, setItems] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)

  const load = useCallback(async () => {
    const { data } = await supabase.from('nav_items').select('*').order('sort_order')
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

  function openEdit(item: NavItem) {
    setEditingId(item.id)
    setForm({
      label: item.label,
      href: item.href,
      target: (item.target as '_self' | '_blank') ?? '_self',
      sort_order: String(item.sort_order ?? 0),
      is_active: item.is_active,
    })
    setModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const parsed = navItemSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    const result = editingId
      ? await supabase.from('nav_items').update(parsed.data).eq('id', editingId)
      : await supabase.from('nav_items').insert(parsed.data)
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
    if (!confirm('Удалить пункт меню?')) return
    const { error } = await supabase.from('nav_items').delete().eq('id', id)
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
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Навигация</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Пункты меню в шапке сайта</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Добавить
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Название
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ссылка
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Порядок
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Активен
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{item.label}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.href}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.sort_order}</td>
                <td className="px-4 py-3">{item.is_active ? '✓' : '—'}</td>
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
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <form onSubmit={save} className="p-5 sm:p-6 space-y-4">
              <h2 className="text-2xl font-bold">
                {editingId ? 'Редактировать пункт' : 'Новый пункт'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  required
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ссылка *
                </label>
                <input
                  type="text"
                  required
                  value={form.href}
                  onChange={(e) => setForm({ ...form, href: e.target.value })}
                  placeholder="#bouquets или /about"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target
                  </label>
                  <select
                    value={form.target}
                    onChange={(e) =>
                      setForm({ ...form, target: e.target.value as '_self' | '_blank' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="_self">_self</option>
                    <option value="_blank">_blank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Порядок
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span className="text-sm">Активен</span>
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
