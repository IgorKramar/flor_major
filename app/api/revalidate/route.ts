import { revalidateTag, revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { SITE_CACHE_TAG } from '@/lib/site-data'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const tag = typeof body?.tag === 'string' ? body.tag : SITE_CACHE_TAG
  const path = typeof body?.path === 'string' ? body.path : null

  revalidateTag(tag, { expire: 0 })
  if (path) revalidatePath(path)

  return NextResponse.json({ ok: true, tag, path })
}
