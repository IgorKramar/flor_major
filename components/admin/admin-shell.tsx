'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AdminSidebar, AdminMobileNav } from '@/components/admin/sidebar'
import { Spinner } from '@/components/ui/spinner'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !session && pathname !== '/admin/login') {
      router.push('/admin/login')
    }
  }, [session, loading, router, pathname])

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="lg:pl-64 pb-20 lg:pb-8">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      <AdminMobileNav />
    </div>
  )
}
