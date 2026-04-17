'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import type { Tables } from '@/lib/database.types'

type AdminUser = Tables<'admin_users'>

export default function UsersPage() {
  const { supabase, user } = useAuth()
  const [items, setItems] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<'owner' | 'admin' | 'editor'>('admin')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Ошибка загрузки')
    } else {
      setItems(data ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserId.trim()) return
    const { error } = await supabase.from('admin_users').insert({
      user_id: newUserId.trim(),
      role: newRole,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Администратор добавлен')
    setModal(false)
    setNewUserId('')
    load()
  }

  async function remove(row: AdminUser) {
    if (row.user_id === user?.id) {
      toast.error('Нельзя удалить собственный доступ')
      return
    }
    if (!confirm('Удалить доступ?')) return
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('user_id', row.user_id)
    if (error) {
      toast.error('Ошибка удаления')
      return
    }
    toast.success('Удалено')
    load()
  }

  async function changeRole(row: AdminUser, role: string) {
    const { error } = await supabase
      .from('admin_users')
      .update({ role })
      .eq('user_id', row.user_id)
    if (error) {
      toast.error('Ошибка обновления')
      return
    }
    toast.success('Роль обновлена')
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
            Администраторы
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Управление доступом к панели управления
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Добавить
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        User ID берётся из Supabase Auth → Users. Скопируйте UUID пользователя,
        которого нужно сделать админом, и вставьте ниже. Пользователь должен уже
        быть зарегистрирован в системе.
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            Нет администраторов
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Роль
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Создано
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row) => (
                <tr key={row.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-[10px] sm:text-xs text-gray-700 break-all">
                    {row.user_id}
                    {row.user_id === user?.id && (
                      <span className="ml-2 text-xs text-primary whitespace-nowrap">(вы)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.role}
                      onChange={(e) => changeRole(row, e.target.value)}
                      disabled={row.user_id === user?.id}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(row.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(row)}
                      disabled={row.user_id === user?.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <form onSubmit={add} className="p-5 sm:p-6 space-y-4">
              <h2 className="text-2xl font-bold">Добавить администратора</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID (UUID)
                </label>
                <input
                  type="text"
                  required
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Роль
                </label>
                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as 'owner' | 'admin' | 'editor')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="owner">owner — полный доступ</option>
                  <option value="admin">admin — стандартный админ</option>
                  <option value="editor">editor — редактор контента</option>
                </select>
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
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
