'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mail, Phone, Clock, MessageSquare, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import type { Tables } from '@/lib/database.types'

type Lead = Tables<'leads'>
type LeadStatus = 'new' | 'contacted' | 'completed' | 'cancelled'

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Новая',
  contacted: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
}

export default function LeadsPage() {
  const { supabase } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | LeadStatus>('all')
  const [selected, setSelected] = useState<Lead | null>(null)
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Ошибка загрузки заявок')
    } else {
      setLeads(data ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const channel = supabase
      .channel('admin-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead
            setLeads((prev) => [newLead, ...prev])
            toast.success(`Новая заявка от ${newLead.name}`)
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((lead) =>
                lead.id === (payload.new as Lead).id ? (payload.new as Lead) : lead,
              ),
            )
          } else if (payload.eventType === 'DELETE') {
            setLeads((prev) => prev.filter((lead) => lead.id !== (payload.old as Lead).id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  async function updateStatus(id: number, status: LeadStatus) {
    const prev = leads
    setLeads((rows) =>
      rows.map((row) => (row.id === id ? { ...row, status } : row)),
    )
    setSelected((current) =>
      current && current.id === id ? { ...current, status } : current,
    )

    const { error } = await supabase.from('leads').update({ status }).eq('id', id)
    if (error) {
      setLeads(prev)
      toast.error('Ошибка обновления')
      return
    }
    toast.success('Статус обновлён')
  }

  async function saveNotes() {
    if (!selected) return
    const handledAt = new Date().toISOString()
    const prev = leads
    setLeads((rows) =>
      rows.map((row) =>
        row.id === selected.id ? { ...row, notes, handled_at: handledAt } : row,
      ),
    )

    const { error } = await supabase
      .from('leads')
      .update({ notes, handled_at: handledAt })
      .eq('id', selected.id)
    if (error) {
      setLeads(prev)
      toast.error('Ошибка сохранения')
      return
    }
    toast.success('Заметки сохранены')
    setSelected({ ...selected, notes, handled_at: handledAt })
  }

  const filteredLeads = useMemo(
    () =>
      filter === 'all' ? leads : leads.filter((lead) => lead.status === filter),
    [leads, filter],
  )

  const stats = useMemo(
    () => ({
      all: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
      completed: leads.filter((l) => l.status === 'completed').length,
      cancelled: leads.filter((l) => l.status === 'cancelled').length,
    }),
    [leads],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Заявки</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Управление заявками клиентов (обновляется в реальном времени)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'new', 'contacted', 'completed', 'cancelled'] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {status === 'all' ? 'Все' : STATUS_LABELS[status]} ({stats[status]})
            </button>
          ),
        )}
      </div>

      <div className="md:hidden space-y-3">
        {filteredLeads.map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => {
              setSelected(lead)
              setNotes(lead.notes ?? '')
            }}
            className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-dark font-semibold">
                  {lead.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                      STATUS_COLORS[lead.status as LeadStatus] ??
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{lead.phone}</span>
                </div>
                {lead.interest && (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {lead.interest}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <Clock className="w-3 h-3" />
                  {new Date(lead.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            <div
              className="mt-3 pt-3 border-t border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={lead.status}
                onChange={(e) =>
                  updateStatus(lead.id, e.target.value as LeadStatus)
                }
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="new">Новая</option>
                <option value="contacted">В работе</option>
                <option value="completed">Завершена</option>
                <option value="cancelled">Отменена</option>
              </select>
            </div>
          </button>
        ))}

        {filteredLeads.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Заявок не найдено</p>
          </div>
        )}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Клиент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Интерес
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelected(lead)
                    setNotes(lead.notes ?? '')
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(lead.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary-dark font-semibold">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="text-sm text-gray-900">
                        {lead.interest || 'Не указано'}
                      </p>
                      {lead.message && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {lead.message}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[lead.status as LeadStatus] ??
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                    </span>
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        updateStatus(lead.id, e.target.value as LeadStatus)
                      }
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="new">Новая</option>
                      <option value="contacted">В работе</option>
                      <option value="completed">Завершена</option>
                      <option value="cancelled">Отменена</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Заявок не найдено</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Заявка #{selected.id}
                </h2>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Имя</span>
                  <span className="col-span-2 font-medium">{selected.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Телефон</span>
                  <a
                    href={`tel:${selected.phone}`}
                    className="col-span-2 font-medium text-primary"
                  >
                    {selected.phone}
                  </a>
                </div>
                {selected.interest && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-500">Интерес</span>
                    <span className="col-span-2">{selected.interest}</span>
                  </div>
                )}
                {selected.message && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-500">Сообщение</span>
                    <span className="col-span-2 whitespace-pre-wrap">
                      {selected.message}
                    </span>
                  </div>
                )}
                {selected.source && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-500">Источник</span>
                    <span className="col-span-2">{selected.source}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Создано</span>
                  <span className="col-span-2">
                    {new Date(selected.created_at).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Внутренние заметки
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Закрыть
                </button>
                <button
                  onClick={saveNotes}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
                >
                  Сохранить заметки
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
