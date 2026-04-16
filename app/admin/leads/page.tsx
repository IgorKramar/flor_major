'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Phone, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Lead {
  id: number
  name: string
  phone: string
  message?: string
  interest?: string
  status: 'new' | 'contacted' | 'completed' | 'cancelled'
  created_at: string
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels = {
  new: 'Новая',
  contacted: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    loadLeads()
  }, [])

  async function loadLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
      toast.error('Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: number, status: Lead['status']) {
    try {
      const { error } = await supabase.from('leads').update({ status }).eq('id', id)
      if (error) throw error
      toast.success('Статус обновлен')
      loadLeads()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Ошибка обновления статуса')
    }
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter((lead) => lead.status === filter)

  const stats = {
    all: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    completed: leads.filter((l) => l.status === 'completed').length,
    cancelled: leads.filter((l) => l.status === 'cancelled').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Заявки</h1>
        <p className="text-gray-600 mt-1">Управление заявками клиентов</p>
      </div>

      {/* Stats & Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'new', 'contacted', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {status === 'all' ? 'Все' : statusLabels[status]} ({stats[status]})
          </button>
        ))}
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                <tr key={lead.id} className="hover:bg-gray-50">
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
                      <p className="text-sm text-gray-900">{lead.interest || 'Не указано'}</p>
                      {lead.message && (
                        <p className="text-sm text-gray-500 truncate mt-1">{lead.message}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusColors[lead.status]
                      }`}
                    >
                      {statusLabels[lead.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value as Lead['status'])}
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
    </div>
  )
}
