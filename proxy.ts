import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ADMIN_PREFIX = '/admin'
const LOGIN_PATH = '/admin/login'
const MAINTENANCE_PATH = '/maintenance'

async function fetchFlags(_request: NextRequest): Promise<{ maintenance: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return { maintenance: false }
  try {
    const res = await fetch(
      `${url}/rest/v1/site_settings?select=maintenance_mode&id=eq.1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: 'application/json',
        },
        next: { revalidate: 30, tags: ['site-data'] },
      }
    )
    if (!res.ok) return { maintenance: false }
    const rows = (await res.json()) as Array<{ maintenance_mode?: boolean }>
    return { maintenance: Boolean(rows[0]?.maintenance_mode) }
  } catch {
    return { maintenance: false }
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const { response, user, supabase } = await updateSession(request)

  if (pathname.startsWith(ADMIN_PREFIX) && pathname !== LOGIN_PATH) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = LOGIN_PATH
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminRow) {
      const url = request.nextUrl.clone()
      url.pathname = LOGIN_PATH
      url.searchParams.set('error', 'not_admin')
      return NextResponse.redirect(url)
    }

    return response
  }

  if (pathname === LOGIN_PATH || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return response
  }

  if (pathname !== MAINTENANCE_PATH) {
    const { maintenance } = await fetchFlags(request)
    if (maintenance) {
      const url = request.nextUrl.clone()
      url.pathname = MAINTENANCE_PATH
      return NextResponse.rewrite(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
