'use server'

import { headers } from 'next/headers'
import { createHash } from 'crypto'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { leadSchema } from '@/lib/validation/schemas'

export interface SubmitLeadState {
  success: boolean
  message: string
  fieldErrors?: Record<string, string>
}

const RATE_LIMIT_WINDOW_MINUTES = 10
const RATE_LIMIT_MAX = 5

function hashIp(ip: string | null | undefined): string {
  const salt = process.env.RATE_LIMIT_SALT || 'flormajor-salt'
  return createHash('sha256').update(`${salt}:${ip ?? 'unknown'}`).digest('hex')
}

async function notifyTelegram(payload: {
  name: string
  phone: string
  interest?: string | null
  message?: string | null
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  const text = [
    '*Новая заявка на сайте*',
    `*Имя:* ${payload.name}`,
    `*Телефон:* ${payload.phone}`,
    payload.interest ? `*Интерес:* ${payload.interest}` : null,
    payload.message ? `*Сообщение:* ${payload.message}` : null,
  ]
    .filter(Boolean)
    .join('\n')
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
  } catch (error) {
    console.error('[submit-lead] telegram notify failed', error)
  }
}

export async function submitLead(
  _prev: SubmitLeadState,
  formData: FormData
): Promise<SubmitLeadState> {
  const parsed = leadSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    interest: formData.get('interest') || null,
    message: formData.get('message') || null,
    source: 'website',
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_')
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return {
      success: false,
      message: 'Пожалуйста, проверьте заполнение формы.',
      fieldErrors,
    }
  }

  let supabase
  try {
    supabase = createAdminSupabase()
  } catch (error) {
    console.error('[submit-lead] service role missing', error)
    return {
      success: false,
      message: 'Сейчас не удаётся принять заявку. Позвоните нам, пожалуйста.',
    }
  }

  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    hdrs.get('x-real-ip') ??
    null
  const userAgent = hdrs.get('user-agent') ?? null
  const ipHash = hashIp(ip)
  const bucket = 'submit-lead'

  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000
  ).toISOString()
  const { count: recent } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .eq('ip_hash', ipHash)
    .gte('created_at', windowStart)

  if ((recent ?? 0) >= RATE_LIMIT_MAX) {
    return {
      success: false,
      message:
        'Слишком много попыток. Пожалуйста, подождите немного и попробуйте снова.',
    }
  }

  const { error } = await supabase.from('leads').insert({
    name: parsed.data.name,
    phone: parsed.data.phone,
    interest: parsed.data.interest,
    message: parsed.data.message,
    source: parsed.data.source,
    ip_hash: ipHash,
    user_agent: userAgent,
  })

  if (error) {
    console.error('[submit-lead] insert error', error)
    return {
      success: false,
      message: 'Ошибка отправки. Попробуйте позже или позвоните нам.',
    }
  }

  await supabase.from('rate_limits').insert({ bucket, ip_hash: ipHash })

  await notifyTelegram({
    name: parsed.data.name,
    phone: parsed.data.phone,
    interest: parsed.data.interest,
    message: parsed.data.message,
  })

  return {
    success: true,
    message: 'Спасибо! Флорист свяжется с вами в ближайшее время.',
  }
}
