import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

/**
 * Service-role клиент. Используется только в server-side коде (Route Handlers,
 * Edge Functions, server actions), которому нужно обходить RLS.
 */
export function createAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY не задан. Операции, требующие повышенных прав, невозможны.'
    )
  }
  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Anon-клиент без cookies — для анонимных публичных запросов.
 */
export function createAnonSupabase() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
