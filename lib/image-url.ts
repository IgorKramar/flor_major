/**
 * Трансформация Supabase Storage public URL → Render URL (imgproxy).
 * Возвращает URL вида /storage/v1/render/image/public/<bucket>/<path>?width=...&quality=...
 *
 * Если URL — не наш Storage public URL, возвращается без изменений
 * (внешние картинки типа images.unsplash.com / avatars.mds.yandex.net не трогаем).
 */

const STORAGE_OBJECT_PATH = '/storage/v1/object/public/'
const STORAGE_RENDER_PATH = '/storage/v1/render/image/public/'

export interface RenderImageOptions {
  width?: number
  height?: number
  quality?: number
  resize?: 'cover' | 'contain' | 'fill'
  format?: 'origin' | 'webp' | 'avif'
}

export function getRenderUrl(url: string | null | undefined, opts: RenderImageOptions = {}): string {
  if (!url) return ''
  if (!url.includes(STORAGE_OBJECT_PATH)) return url

  const renderUrl = url.replace(STORAGE_OBJECT_PATH, STORAGE_RENDER_PATH)

  const params = new URLSearchParams()
  if (opts.width) params.set('width', String(opts.width))
  if (opts.height) params.set('height', String(opts.height))
  if (opts.quality !== undefined) params.set('quality', String(opts.quality))
  if (opts.resize) params.set('resize', opts.resize)
  if (opts.format) params.set('format', opts.format)

  const qs = params.toString()
  return qs ? `${renderUrl}?${qs}` : renderUrl
}

/**
 * Whitelist хостов для ручной вставки URL в админке (AUDIT C1).
 * Добавлять сюда новые домены сознательно: вставленный URL отображается на публичном сайте.
 */
export const ALLOWED_IMAGE_HOSTS = [
  'db.flormajor-omsk.ru',
  'gaojqaqpreuvcwxmngqp.supabase.co', // legacy URL'ы из Cloud, оставлены для совместимости до ре-аплоада
  'images.unsplash.com',
  'avatars.mds.yandex.net',
] as const

export function isAllowedImageUrl(input: string): boolean {
  if (!input) return false
  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  return ALLOWED_IMAGE_HOSTS.some((h) => parsed.hostname === h)
}
