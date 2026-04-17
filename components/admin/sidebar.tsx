'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  Image as ImageIcon,
  FileText,
  Palette,
  LogOut,
  Layers,
  ListTree,
  Sparkles,
  Link2,
  FileSearch,
  ShieldCheck,
  Globe,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const navigation = [
  { name: 'Обзор', href: '/admin', icon: LayoutDashboard },
  { name: 'Букеты', href: '/admin/products', icon: Package },
  { name: 'Категории', href: '/admin/categories', icon: Layers },
  { name: 'Заявки', href: '/admin/leads', icon: Users },
  { name: 'Hero', href: '/admin/hero', icon: ImageIcon },
  { name: 'Преимущества', href: '/admin/features', icon: Sparkles },
  { name: 'Навигация', href: '/admin/navigation', icon: ListTree },
  { name: 'Соцсети', href: '/admin/social', icon: Link2 },
  { name: 'Футер', href: '/admin/footer', icon: Globe },
  { name: 'Контакты', href: '/admin/contacts', icon: FileText },
  { name: 'SEO', href: '/admin/seo', icon: FileSearch },
  { name: 'Стиль', href: '/admin/appearance', icon: Palette },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
  { name: 'Аудит', href: '/admin/audit', icon: ShieldCheck },
  { name: 'Пользователи', href: '/admin/users', icon: UsersRound },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 hidden lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Link href="/admin" className="text-xl font-serif font-bold text-gray-900">
          Флор Мажор
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary-dark'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Выйти
        </button>
      </div>
    </aside>
  )
}

export function AdminMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5 gap-1 p-2">
        {navigation.slice(0, 5).map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-primary-dark' : 'text-gray-600'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
