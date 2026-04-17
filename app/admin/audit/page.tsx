'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileClock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import type { Tables } from '@/lib/database.types'

type AuditLog = Tables<'audit_log'>

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
}

export default function AuditPage() {
  const { supabase } = useAuth()
  const [items, setItems] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (tableFilter !== 'all') {
      query = query.eq('table_name', tableFilter)
    }

    const { data, error } = await query
    if (error) {
      toast.error('Ошибка загрузки журнала')
    } else {
      setItems(data ?? [])
    }
    setLoading(false)
  }, [supabase, tableFilter])

  useEffect(() => {
    load()
  }, [load])

  const tables = Array.from(new Set(items.map((i) => i.table_name)))

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
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
          Журнал изменений
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Последние 200 операций INSERT / UPDATE / DELETE
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTableFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            tableFilter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Все
        </button>
        {tables.map((t) => (
          <button
            key={t}
            onClick={() => setTableFilter(t)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              tableFilter === t
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileClock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            Записей нет
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <details key={item.id} className="group">
                <summary className="px-3 sm:px-4 py-3 cursor-pointer hover:bg-gray-50 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      ACTION_COLORS[item.action] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.action}
                  </span>
                  <span className="font-medium text-gray-900 break-all">
                    {item.table_name}
                  </span>
                  {item.record_id != null && (
                    <span className="text-gray-500">#{item.record_id}</span>
                  )}
                  <span className="text-gray-400 text-xs sm:text-sm sm:ml-auto w-full sm:w-auto">
                    {new Date(item.created_at).toLocaleString('ru-RU')}
                  </span>
                </summary>
                <div className="px-6 py-4 bg-gray-50 text-xs space-y-3">
                  {item.before != null && (
                    <div>
                      <div className="font-medium text-gray-500 mb-1">До</div>
                      <pre className="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(item.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {item.after != null && (
                    <div>
                      <div className="font-medium text-gray-500 mb-1">После</div>
                      <pre className="bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(item.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
