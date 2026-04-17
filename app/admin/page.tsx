'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, Users, TrendingUp, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import type { Tables } from '@/lib/database.types'

type Lead = Tables<'leads'>

interface DashboardStats {
  totalProducts: number
  totalLeads: number
  newLeadsToday: number
  featuredProducts: number
}

export default function AdminDashboard() {
  const { supabase } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalLeads: 0,
    newLeadsToday: 0,
    featuredProducts: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])

  const loadDashboardData = useCallback(async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [
        { count: productsCount },
        { count: featuredCount },
        { count: leadsCount },
        { count: todayCount },
        { data: leads },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_featured', true),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        totalProducts: productsCount ?? 0,
        totalLeads: leadsCount ?? 0,
        newLeadsToday: todayCount ?? 0,
        featuredProducts: featuredCount ?? 0,
      })
      setRecentLeads(leads ?? [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadDashboardData()
    const channel = supabase
      .channel('dashboard-leads')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const lead = payload.new as Lead
          toast.success(`Новая заявка от ${lead.name}`, {
            description: lead.phone,
          })
          loadDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadDashboardData])

  const statCards = [
    {
      name: 'Всего букетов',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/products',
    },
    {
      name: 'Всего заявок',
      value: stats.totalLeads,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/admin/leads',
    },
    {
      name: 'Заявок сегодня',
      value: stats.newLeadsToday,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/admin/leads',
    },
    {
      name: 'Избранных товаров',
      value: stats.featuredProducts,
      icon: Eye,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/products',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Обзор</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Добро пожаловать в панель управления ФЛОРМАЖОР
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">{stat.name}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Последние заявки
          </h2>
          {recentLeads.length === 0 ? (
            <p className="text-gray-500 text-sm">Заявок пока нет</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads?id=${lead.id}`}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                    <p className="text-sm text-gray-600 truncate">{lead.phone}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Быстрые действия
          </h2>
          <div className="space-y-3">
            <Link
              href="/admin/products?action=new"
              className="block p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="font-medium text-primary-dark">
                Добавить новый букет
              </span>
              <p className="text-sm text-gray-600 mt-1">Создать карточку товара</p>
            </Link>
            <Link
              href="/admin/hero"
              className="block p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="font-medium text-primary-dark">
                Настроить Hero
              </span>
              <p className="text-sm text-gray-600 mt-1">
                Изменить баннер и призыв к действию
              </p>
            </Link>
            <Link
              href="/admin/contacts"
              className="block p-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <span className="font-medium text-primary-dark">
                Обновить контакты
              </span>
              <p className="text-sm text-gray-600 mt-1">Телефон, адрес, email</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
