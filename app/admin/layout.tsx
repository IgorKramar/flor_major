import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import { AdminShell } from '@/components/admin/admin-shell'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  )
}
