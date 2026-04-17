'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui/spinner'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, signOut, session, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const notAdmin = searchParams.get('error') === 'not_admin'

  useEffect(() => {
    if (notAdmin) {
      setError(
        'Ваш аккаунт вошёл в систему, но у него нет прав на панель управления. Обратитесь к владельцу проекта.',
      )
    }
  }, [notAdmin])

  useEffect(() => {
    if (!loading && session && !notAdmin) {
      router.push('/admin')
    }
  }, [session, loading, router, notAdmin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message || 'Ошибка входа')
    }

    setIsSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (session && !notAdmin) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 mb-2">
            Флор Мажор
          </h1>
          <p className="text-gray-600">Панель управления</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Вход в админку
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="admin@flormajor.ru"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-5 h-5" />
                  <span>Входим...</span>
                </>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          {notAdmin && session && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={async () => {
                  await signOut()
                  router.replace('/admin/login')
                }}
                className="text-sm text-gray-600 hover:text-primary transition-colors underline"
              >
                Выйти и войти под другим аккаунтом
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Доступ только для авторизованных сотрудников
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
