'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, Star, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

interface DashboardStats {
  totalProducts: number
  featuredProducts: number
  lastUpdatedAt: string | null
}

interface RecentProduct {
  id: number
  title: string
  slug: string
  updated_at: string
}

export default function AdminDashboard() {
  const { supabase } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    featuredProducts: 0,
    lastUpdatedAt: null,
  })
  const [loading, setLoading] = useState(true)
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])

  const loadDashboardData = useCallback(async () => {
    try {
      const [
        { count: productsCount },
        { count: featuredCount },
        { data: recent },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_featured', true),
        supabase
          .from('products')
          .select('id, title, slug, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5),
      ])

      const recentList = (recent ?? []) as RecentProduct[]
      setStats({
        totalProducts: productsCount ?? 0,
        featuredProducts: featuredCount ?? 0,
        lastUpdatedAt: recentList[0]?.updated_at ?? null,
      })
      setRecentProducts(recentList)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

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
      name: 'Избранных товаров',
      value: stats.featuredProducts,
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/products',
    },
    {
      name: 'Последнее обновление',
      value: stats.lastUpdatedAt
        ? new Date(stats.lastUpdatedAt).toLocaleDateString('ru-RU')
        : '—',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
            Последние обновлённые товары
          </h2>
          {recentProducts.length === 0 ? (
            <p className="text-gray-500 text-sm">Товаров пока нет</p>
          ) : (
            <div className="space-y-3">
              {recentProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/products?id=${p.id}`}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-sm text-gray-600 truncate">/catalog/{p.slug}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                    {new Date(p.updated_at).toLocaleDateString('ru-RU')}
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
