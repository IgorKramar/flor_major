'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useVirtualKeyboard } from '@/lib/hooks/use-virtual-keyboard'
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
  FileSearch,
  ShieldCheck,
  Globe,
  UsersRound,
  MoreHorizontal,
  BookOpen,
  PackageOpen,
  Heart,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const navigation = [
  { name: 'Обзор', href: '/admin', icon: LayoutDashboard },
  { name: 'Товары', href: '/admin/products', icon: Package },
  { name: 'Категории', href: '/admin/categories', icon: Layers },
  { name: 'Заявки', href: '/admin/leads', icon: Users },
  { name: 'Hero', href: '/admin/hero', icon: ImageIcon },
  { name: 'Преимущества', href: '/admin/features', icon: Sparkles },
  { name: 'Навигация', href: '/admin/navigation', icon: ListTree },
  { name: 'Футер', href: '/admin/footer', icon: Globe },
  { name: 'Контакты', href: '/admin/contacts', icon: FileText },
  { name: 'Страница каталога', href: '/admin/catalog-page', icon: BookOpen },
  { name: 'Страница товара', href: '/admin/product-page', icon: PackageOpen },
  { name: 'Страница «Спасибо»', href: '/admin/thanks', icon: Heart },
  { name: 'SEO', href: '/admin/seo', icon: FileSearch },
  { name: 'Брендинг', href: '/admin/appearance', icon: Palette },
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

const PRIMARY_MOBILE_ITEMS = 4

export function AdminMobileNav() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const { isOpen: keyboardOpen } = useVirtualKeyboard()

  const primaryItems = navigation.slice(0, PRIMARY_MOBILE_ITEMS)
  const secondaryItems = navigation.slice(PRIMARY_MOBILE_ITEMS)
  const isSecondaryActive = secondaryItems.some((item) => item.href === pathname)

  useEffect(() => {
    setIsSheetOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isSheetOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isSheetOpen])

  if (keyboardOpen) return null

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
        aria-label="Основная навигация"
      >
        <div className="grid grid-cols-5 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {primaryItems.map((item) => {
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

          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            aria-expanded={isSheetOpen}
            aria-controls="admin-mobile-sheet"
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-medium transition-colors',
              isSecondaryActive ? 'text-primary-dark' : 'text-gray-600'
            )}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            Ещё
          </button>
        </div>
      </nav>

      {isSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-60"
          role="dialog"
          aria-modal="true"
          aria-label="Дополнительная навигация"
          id="admin-mobile-sheet"
        >
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setIsSheetOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-100">
              <span className="text-base font-semibold text-gray-900">Разделы</span>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="p-2 -mr-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <ul className="grid grid-cols-2 gap-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary-dark'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>

              <button
                type="button"
                onClick={() => {
                  setIsSheetOpen(false)
                  signOut()
                }}
                className="mt-3 flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
