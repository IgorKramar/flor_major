# Image Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Резко снизить вес отдаваемых картинок ФлорМажор-сайта: переключить отдачу на Supabase Storage Renderer (imgproxy → webp + resize), добавить pre-upload компрессию в админке, закрыть AUDIT C1 (whitelist URL для ручной вставки).

**Architecture:** Два helper'а в `lib/`: `image-url.ts` для трансформации Storage public URL в Render URL и для проверки whitelist'а; `image-compress.ts` для browser-side компрессии через `browser-image-compression`. Публичные компоненты получают src через `getRenderUrl(url, { width, quality })`. Админ-компоненты компрессят файл перед `supabase.storage.from('media').upload()`. Никаких изменений схемы БД, только клиентский/SSR код.

**Tech Stack:** Next.js 16 (App Router, Server Components, `next/image`), React 19, TypeScript strict, Supabase Storage (`/storage/v1/render/image/...` через imgproxy уже в self-hosted стеке), `browser-image-compression` v2, Vitest.

**Базовый контекст:**
- Memory `followup_image_compression.md` — главное обоснование (КРИТИЧНО для бизнеса).
- Memory `followup_imgproxy_render_urls.md` — URL-сторона задачи.
- AUDIT.md C1 — whitelist для ручных URL картинок.

---

## Контекст для исполнителя (читать первым)

ФлорМажор — флористический сайт, картинки = товар. Сейчас отдаются оригиналы PNG/JPG 3-5 МБ — это убивает Core Web Vitals и конверсию. У нас уже работает self-hosted Supabase с встроенным imgproxy, доступным через `${SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${path}?width=W&quality=Q[&format=webp|avif]`.

**Что мы НЕ делаем:**
- Не меняем формат хранения (оригиналы остаются в `media` bucket).
- Не пишем backfill: уже загруженные картинки будут отдаваться через тот же helper, просто URL станет `/render/image/...` вместо `/object/public/...`.
- Не трогаем БД-схему. Поля `image_url` / `url` в `categories`/`products`/`product_images`/`hero_settings` хранят полный URL без изменений.

**Среда выполнения:**
- Все pnpm-команды через `mise exec --` (как в плане B).
- Локальный `.env.local` уже на self-hosted (`https://db.flormajor-omsk.ru`).
- Build (`pnpm build`) НЕ запускаем локально (Google Fonts), верифицируем при деплое.

---

## File Structure

**Создаются:**

| Файл | Назначение |
|---|---|
| `lib/image-url.ts` | `getRenderUrl(url, opts)` — трансформирует public URL Storage в render URL. `isAllowedImageUrl(url)` — whitelist. `ALLOWED_IMAGE_HOSTS` — список разрешённых хостов |
| `lib/image-compress.ts` | `compressImage(file, opts)` — browser-only компрессия через `browser-image-compression`. Возвращает новый File |
| `tests/image-url.test.ts` | Unit-тесты на `getRenderUrl` и `isAllowedImageUrl` |

**Модифицируются:**

| Файл | Что меняется |
|---|---|
| `package.json` | Добавить `browser-image-compression` в `dependencies` |
| `components/admin/image-upload.tsx` | Прогнать файл через `compressImage` перед `.upload()`. В ручной вставке URL — проверять через `isAllowedImageUrl`. Превью использует `getRenderUrl` |
| `components/admin/product-images-editor.tsx` | То же: компрессия перед upload, whitelist для `addByUrl`, превью через `getRenderUrl` |
| `components/hero-section.tsx` | `<Image src={getRenderUrl(image, { width: 1920, quality: 80 })} />` |
| `components/product-carousel.tsx` | `<Image src={getRenderUrl(image, { width: 800 })} />` |
| `components/catalog-browser.tsx` | `<Image src={getRenderUrl(image, { width: 600 })} />` |
| `components/catalog-section.tsx` | `<Image src={getRenderUrl(item.image_url, { width: 600 })} />` |
| `components/product-gallery.tsx` | `<Image src={getRenderUrl(active.url, { width: 1200 })} />` для основного, `width: 200` для thumbnails |
| `app/catalog/[slug]/page.tsx` | `getRenderUrl(primaryImage(item), { width: 600 })` для секции «похожие» |

**В коде НЕ меняем:**
- `lib/site-data.ts` — там нет URL-логики, только сырые данные из БД.
- БД-миграции — никаких.

---

## Phase 1 — Helper для URL трансформации

### Task 1: Создать `lib/image-url.ts`

**Files:**
- Create: `lib/image-url.ts`

- [ ] **Step 1: Создать файл с тремя экспортами**

```typescript
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
```

- [ ] **Step 2: typecheck**

Run: `mise exec -- pnpm typecheck`
Expected: pass.

---

### Task 2: Unit-тесты на `getRenderUrl` и `isAllowedImageUrl`

**Files:**
- Create: `tests/image-url.test.ts`

- [ ] **Step 1: Написать тесты**

```typescript
import { describe, it, expect } from 'vitest'
import { getRenderUrl, isAllowedImageUrl } from '@/lib/image-url'

describe('getRenderUrl', () => {
  const SUPA_URL =
    'https://db.flormajor-omsk.ru/storage/v1/object/public/media/products/file.png'

  it('returns empty string for null/undefined', () => {
    expect(getRenderUrl(null)).toBe('')
    expect(getRenderUrl(undefined)).toBe('')
    expect(getRenderUrl('')).toBe('')
  })

  it('returns URL unchanged when not a Storage public URL', () => {
    const ext = 'https://images.unsplash.com/photo-1234?w=100'
    expect(getRenderUrl(ext)).toBe(ext)
    expect(getRenderUrl(ext, { width: 800 })).toBe(ext)
  })

  it('rewrites object/public to render/image/public without params', () => {
    expect(getRenderUrl(SUPA_URL)).toBe(
      'https://db.flormajor-omsk.ru/storage/v1/render/image/public/media/products/file.png',
    )
  })

  it('appends width and quality query params', () => {
    expect(getRenderUrl(SUPA_URL, { width: 1200, quality: 80 })).toBe(
      'https://db.flormajor-omsk.ru/storage/v1/render/image/public/media/products/file.png?width=1200&quality=80',
    )
  })

  it('appends resize and format params', () => {
    expect(getRenderUrl(SUPA_URL, { width: 600, resize: 'cover', format: 'webp' })).toBe(
      'https://db.flormajor-omsk.ru/storage/v1/render/image/public/media/products/file.png?width=600&resize=cover&format=webp',
    )
  })

  it('keeps quality=0 explicit (not falsy-skipped)', () => {
    expect(getRenderUrl(SUPA_URL, { quality: 0 })).toBe(
      'https://db.flormajor-omsk.ru/storage/v1/render/image/public/media/products/file.png?quality=0',
    )
  })
})

describe('isAllowedImageUrl', () => {
  it('rejects empty/invalid URL', () => {
    expect(isAllowedImageUrl('')).toBe(false)
    expect(isAllowedImageUrl('not a url')).toBe(false)
    expect(isAllowedImageUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects http/https on disallowed hosts', () => {
    expect(isAllowedImageUrl('https://evil.example.com/cat.jpg')).toBe(false)
    expect(isAllowedImageUrl('http://localhost/file')).toBe(false)
  })

  it('accepts http and https on allowed hosts', () => {
    expect(
      isAllowedImageUrl('https://db.flormajor-omsk.ru/storage/v1/object/public/media/x.png'),
    ).toBe(true)
    expect(isAllowedImageUrl('https://images.unsplash.com/photo-1234')).toBe(true)
    expect(isAllowedImageUrl('https://avatars.mds.yandex.net/get-mpic/x/orig')).toBe(true)
  })

  it('rejects other protocols', () => {
    expect(isAllowedImageUrl('data:image/png;base64,abc')).toBe(false)
    expect(isAllowedImageUrl('file:///etc/passwd')).toBe(false)
  })
})
```

- [ ] **Step 2: Прогнать тесты**

Run: `mise exec -- pnpm test tests/image-url.test.ts`
Expected: 12 tests passed.

- [ ] **Step 3: Закоммитить**

```bash
git add lib/image-url.ts tests/image-url.test.ts
git commit -m "feat: lib/image-url helper для render URL и whitelist"
```

---

## Phase 2 — Применить `getRenderUrl` в публичных компонентах

### Task 3: `components/hero-section.tsx`

**Files:**
- Modify: `components/hero-section.tsx`

- [ ] **Step 1: Добавить импорт**

В шапку файла рядом с другими импортами:

```typescript
import { getRenderUrl } from '@/lib/image-url'
```

- [ ] **Step 2: Обернуть src в `<Image>`**

Найти строку `src={image}` (примерно строка 101) внутри `<Image>` и заменить на:

```tsx
<Image
  src={getRenderUrl(image, { width: 1920, quality: 80 })}
  ...остальные пропы без изменений
/>
```

> Hero рендерится на главной во весь экран — width 1920 покрывает desktop. Mobile next/image сам ужмёт через `sizes`.

- [ ] **Step 3: typecheck**

Run: `mise exec -- pnpm typecheck`
Expected: pass.

- [ ] **Step 4: Не коммитить — продолжить к остальным компонентам, один коммит на Phase 2**

---

### Task 4: `components/product-carousel.tsx`

**Files:**
- Modify: `components/product-carousel.tsx`

- [ ] **Step 1: Импорт + замена src**

Импорт:
```typescript
import { getRenderUrl } from '@/lib/image-url'
```

Найти `src={image}` (~строка 173) → `src={getRenderUrl(image, { width: 800, quality: 80 })}`.

> Карусель на главной: карточки до 400px на desktop, 2x DPR = 800px.

- [ ] **Step 2: typecheck pass**

---

### Task 5: `components/catalog-browser.tsx`

**Files:**
- Modify: `components/catalog-browser.tsx`

- [ ] **Step 1: Импорт + замена**

Импорт:
```typescript
import { getRenderUrl } from '@/lib/image-url'
```

Найти `src={image}` (~строка 251) → `src={getRenderUrl(image, { width: 600, quality: 80 })}`.

> Каталог: карточки ~300px на desktop, 2x = 600px.

- [ ] **Step 2: typecheck pass**

---

### Task 6: `components/catalog-section.tsx`

**Files:**
- Modify: `components/catalog-section.tsx`

- [ ] **Step 1: Импорт + замена**

Импорт:
```typescript
import { getRenderUrl } from '@/lib/image-url'
```

Найти `src={item.image_url as string}` (~строка 68) → `src={getRenderUrl(item.image_url, { width: 600, quality: 80 })}`.

> Секция категорий на главной: карточки ~300px, 2x = 600px. Заодно убираем `as string` — `getRenderUrl` принимает `string | null | undefined`.

Если TypeScript ругается на `null` — посмотреть, есть ли guard `if (item.image_url)` снаружи. Если нет — можно использовать `getRenderUrl(item.image_url, ...)` без cast'а; функция вернёт `''` для null'а.

- [ ] **Step 2: typecheck pass**

---

### Task 7: `components/product-gallery.tsx`

**Files:**
- Modify: `components/product-gallery.tsx`

- [ ] **Step 1: Импорт**

```typescript
import { getRenderUrl } from '@/lib/image-url'
```

- [ ] **Step 2: Заменить src в основном `<Image>` (~строка 100)**

```tsx
<Image
  src={getRenderUrl(active.url, { width: 1200, quality: 85 })}
  ...
/>
```

> Галерея товара: основная картинка до 800px на desktop, 2x = 1200-1600. Берём 1200 + quality 85 (визуально качество тут важнее).

- [ ] **Step 3: Заменить src в thumbnail `<Image>` (~строка 167)**

```tsx
<Image
  src={getRenderUrl(image.url, { width: 200, quality: 80 })}
  ...
/>
```

> Thumbnails ~80-120px на экране, 2x = 200.

- [ ] **Step 4: typecheck pass**

---

### Task 8: `app/catalog/[slug]/page.tsx`

**Files:**
- Modify: `app/catalog/[slug]/page.tsx`

- [ ] **Step 1: Импорт**

```typescript
import { getRenderUrl } from '@/lib/image-url'
```

- [ ] **Step 2: Заменить src в секции «похожие товары» (~строка 237)**

```tsx
<Image
  src={getRenderUrl(primaryImage(item), { width: 600, quality: 80 })}
  ...
/>
```

- [ ] **Step 3: typecheck + lint + test**

```bash
mise exec -- pnpm typecheck && mise exec -- pnpm lint && mise exec -- pnpm test
```
Expected: всё pass.

- [ ] **Step 4: Закоммитить весь Phase 2**

```bash
git add components/hero-section.tsx components/product-carousel.tsx \
        components/catalog-browser.tsx components/catalog-section.tsx \
        components/product-gallery.tsx app/catalog/\[slug\]/page.tsx
git commit -m "feat: использовать Storage Renderer URLs во всех публичных компонентах"
```

---

## Phase 3 — Pre-upload компрессия

### Task 9: Установить `browser-image-compression`

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Установить пакет**

Run:
```bash
mise exec -- pnpm add browser-image-compression
```
Expected: добавлено в `dependencies` в `package.json`, `pnpm-lock.yaml` обновлён.

- [ ] **Step 2: Проверить версию**

Run: `mise exec -- pnpm list browser-image-compression`
Expected: версия 2.x.

---

### Task 10: Создать `lib/image-compress.ts`

**Files:**
- Create: `lib/image-compress.ts`

- [ ] **Step 1: Создать helper**

```typescript
/**
 * Browser-side компрессия картинки перед загрузкой в Storage.
 * Цель: ужать оригинал 3-5 МБ до 200-500 КБ webp с длинной стороной до 1920px,
 * без существенной потери визуального качества.
 *
 * Не работает в Node — функция использует canvas/createImageBitmap.
 * Использовать только в client components (`'use client'`).
 */

import imageCompression from 'browser-image-compression'

export interface CompressOptions {
  /** Максимальная длинная сторона в px. Default 1920. */
  maxWidthOrHeight?: number
  /** Целевой максимальный размер в МБ. Default 1.5. */
  maxSizeMB?: number
  /** Тип результата. Default 'image/webp'. SVG передаётся без обработки. */
  fileType?: string
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidthOrHeight: 1920,
  maxSizeMB: 1.5,
  fileType: 'image/webp',
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  // SVG и GIF не сжимаем — это векторы / анимации, browser-image-compression их испортит.
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  const merged = { ...DEFAULTS, ...opts }

  const compressed = await imageCompression(file, {
    maxSizeMB: merged.maxSizeMB,
    maxWidthOrHeight: merged.maxWidthOrHeight,
    fileType: merged.fileType,
    useWebWorker: true,
    initialQuality: 0.85,
  })

  // browser-image-compression возвращает Blob, нормализуем в File с осмысленным именем
  const baseName = file.name.replace(/\.[^.]+$/, '')
  const ext = merged.fileType === 'image/webp' ? 'webp' : file.name.split('.').pop() ?? 'jpg'
  return new File([compressed], `${baseName}.${ext}`, { type: merged.fileType })
}
```

- [ ] **Step 2: typecheck**

Run: `mise exec -- pnpm typecheck`
Expected: pass.

> **Тесты на `compressImage` не пишем** — функция использует браузерные API (canvas, createImageBitmap, Worker), которые в Node-среде Vitest не работают без сложных моков. Покрытие — ручной smoke в админке (Phase 5).

- [ ] **Step 3: Закоммитить**

```bash
git add package.json pnpm-lock.yaml lib/image-compress.ts
git commit -m "feat: lib/image-compress + browser-image-compression для админки"
```

---

### Task 11: Интегрировать в `components/admin/image-upload.tsx`

**Files:**
- Modify: `components/admin/image-upload.tsx`

- [ ] **Step 1: Добавить импорты**

В шапку файла:
```typescript
import { compressImage } from '@/lib/image-compress'
import { getRenderUrl, isAllowedImageUrl } from '@/lib/image-url'
```

- [ ] **Step 2: Обновить `handleUpload` — компрессия перед `.upload()`**

Найти текущий блок (примерно строки 27-56):

```typescript
const handleUpload = async (file: File) => {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.error('Можно загружать только изображения')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Файл больше 5 МБ')
    return
  }

  setUploading(true)
  try {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage
      .from('media')
      .upload(path, file, { cacheControl: '31536000', upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    onChange(data.publicUrl)
    setManualUrl(data.publicUrl)
    toast.success('Изображение загружено')
  } catch (error) {
    console.error('upload error', error)
    toast.error('Не удалось загрузить файл')
  } finally {
    setUploading(false)
  }
}
```

Заменить на:

```typescript
const handleUpload = async (file: File) => {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.error('Можно загружать только изображения')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error('Файл больше 10 МБ')
    return
  }

  setUploading(true)
  try {
    const compressed = await compressImage(file)
    const ext = compressed.name.split('.').pop() ?? 'webp'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage
      .from('media')
      .upload(path, compressed, { cacheControl: '31536000', upsert: false, contentType: compressed.type })
    if (error) throw error
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    onChange(data.publicUrl)
    setManualUrl(data.publicUrl)
    toast.success(`Изображение загружено (${(compressed.size / 1024).toFixed(0)} КБ)`)
  } catch (error) {
    console.error('upload error', error)
    toast.error('Не удалось загрузить файл')
  } finally {
    setUploading(false)
  }
}
```

Изменения:
- Лимит 5 → 10 МБ (компрессия всё равно ужмёт).
- Файл прогоняется через `compressImage` (по умолчанию webp 1920px max).
- `ext` берём из имени compressed (там уже `.webp`).
- В `upload()` явно передаём `contentType: compressed.type`.
- В `toast.success` показываем размер сжатого файла — UX-обратная связь.

- [ ] **Step 3: Обновить превью через `<Image>` (используем render URL для thumbnail)**

Найти (примерно строка 64):

```tsx
<Image
  src={value}
  alt="preview"
  fill
  sizes="128px"
  className="object-cover"
/>
```

Заменить:
```tsx
<Image
  src={getRenderUrl(value, { width: 256, quality: 80 })}
  alt="preview"
  fill
  sizes="128px"
  className="object-cover"
/>
```

> 128px на экране × 2 DPR = 256px рендера.

- [ ] **Step 4: AUDIT C1 — whitelist для ручной вставки URL**

Найти кнопку «Применить» (примерно строки 122-128):

```tsx
<button
  type="button"
  onClick={() => onChange(manualUrl || null)}
  className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
>
  Применить
</button>
```

Заменить:
```tsx
<button
  type="button"
  onClick={() => {
    const trimmed = manualUrl.trim()
    if (!trimmed) {
      onChange(null)
      return
    }
    if (!isAllowedImageUrl(trimmed)) {
      toast.error('URL не из разрешённого списка хостов')
      return
    }
    onChange(trimmed)
  }}
  className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
>
  Применить
</button>
```

- [ ] **Step 5: typecheck + lint**

Run: `mise exec -- pnpm typecheck && mise exec -- pnpm lint`
Expected: pass.

- [ ] **Step 6: Не коммитить — продолжить с Task 12 (один коммит на админ-интеграцию)**

---

### Task 12: Интегрировать в `components/admin/product-images-editor.tsx`

**Files:**
- Modify: `components/admin/product-images-editor.tsx`

- [ ] **Step 1: Добавить импорты**

В шапку файла:
```typescript
import { compressImage } from '@/lib/image-compress'
import { getRenderUrl, isAllowedImageUrl } from '@/lib/image-url'
```

- [ ] **Step 2: Обновить `handleFiles` — компрессия перед `.upload()`**

Внутри цикла `for` (примерно строки 37-55) заменить блок с `if (file.size > 5 * 1024 * 1024)`:

```typescript
if (file.size > 10 * 1024 * 1024) {
  toast.error(`Пропущено: ${file.name} — больше 10 МБ`)
  continue
}
const compressed = await compressImage(file)
const ext = compressed.name.split('.').pop() ?? 'webp'
const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
const { error } = await supabase.storage
  .from('media')
  .upload(path, compressed, { cacheControl: '31536000', upsert: false, contentType: compressed.type })
```

Изменения такие же как в Task 11: лимит 10 МБ, `compressImage`, `contentType` явно.

- [ ] **Step 3: Обновить превью через `<Image>` (~строка 174)**

Найти:
```tsx
<Image
  src={image.url}
  alt={image.alt ?? ''}
  fill
  sizes="80px"
  className="object-cover"
/>
```

Заменить:
```tsx
<Image
  src={getRenderUrl(image.url, { width: 160, quality: 80 })}
  alt={image.alt ?? ''}
  fill
  sizes="80px"
  className="object-cover"
/>
```

- [ ] **Step 4: AUDIT C1 — whitelist в `addByUrl`**

Найти функцию `addByUrl` (~строки 104-124):

```typescript
const addByUrl = () => {
  const url = prompt('URL изображения')?.trim()
  if (!url) return
  try {
    new URL(url)
  } catch {
    toast.error('Некорректный URL')
    return
  }
  onChange(
    reindex([
      ...value,
      {
        url,
        alt: null,
        sort_order: value.length,
        is_primary: value.length === 0,
      },
    ]),
  )
}
```

Заменить блок валидации:
```typescript
const addByUrl = () => {
  const url = prompt('URL изображения')?.trim()
  if (!url) return
  if (!isAllowedImageUrl(url)) {
    toast.error('URL не из разрешённого списка хостов')
    return
  }
  onChange(
    reindex([
      ...value,
      {
        url,
        alt: null,
        sort_order: value.length,
        is_primary: value.length === 0,
      },
    ]),
  )
}
```

(Убираем `try/catch new URL(url)` — `isAllowedImageUrl` его сам делает внутри.)

- [ ] **Step 5: typecheck + lint + test**

Run: `mise exec -- pnpm typecheck && mise exec -- pnpm lint && mise exec -- pnpm test`
Expected: всё pass.

- [ ] **Step 6: Закоммитить весь Phase 3 (Tasks 11-12)**

```bash
git add components/admin/image-upload.tsx components/admin/product-images-editor.tsx
git commit -m "feat(admin): pre-upload компрессия + whitelist URL для ручной вставки"
```

---

## Phase 4 — Verification

### Task 13: Финальный прогон + dev смок-тест

**Files:** read-only / dev server

- [ ] **Step 1: Чистый прогон проверок**

Run:
```bash
mise exec -- pnpm lint && mise exec -- pnpm typecheck && mise exec -- pnpm test
```
Expected: lint без новых errors, typecheck pass, 23+12=35 тестов pass.

- [ ] **Step 2: Запустить dev**

Run: `mise exec -- pnpm dev` (в отдельной сессии или фоне).

- [ ] **Step 3: Проверить главную (`http://localhost:3000`)**

Открыть DevTools → Network → отфильтровать по `Img`.
Ожидаемое:
- [ ] Все картинки идут на `https://db.flormajor-omsk.ru/storage/v1/render/image/public/media/...?width=N&quality=80`.
- [ ] **Размер каждой картинки в Network должен быть в десятках/сотнях КБ**, не мегабайтах.
- [ ] Content-Type — `image/webp` (если сервер вернёт; зависит от Accept header).
- [ ] Карточки в карусели/каталоге/категориях рендерятся.

- [ ] **Step 4: Проверить карточку товара (`http://localhost:3000/catalog/buket-romashek`)**

- [ ] Основная картинка загружается через render URL (~width=1200).
- [ ] Thumbnails — render URL (~width=200), маленькие по весу.

- [ ] **Step 5: Проверить админ — pre-upload компрессия**

Войти в `/admin`, открыть «Товары» → редактировать букет → загрузить тестовое **большое** изображение (5+ МБ JPG).

Ожидаемое:
- [ ] Загрузка проходит, toast показывает размер сжатого файла (например «загружено (250 КБ)»).
- [ ] В `media` bucket появляется файл `.webp` с малым размером.
- [ ] Превью отображается через render URL.

- [ ] **Step 6: Проверить админ — whitelist URL**

В том же редакторе товара → «По URL» → попробовать вставить:
- [ ] `https://evil.example.com/cat.jpg` → toast «URL не из разрешённого списка хостов».
- [ ] `javascript:alert(1)` → toast «URL не из разрешённого списка хостов».
- [ ] `https://images.unsplash.com/photo-123` → принимается.
- [ ] `https://db.flormajor-omsk.ru/storage/v1/object/public/media/products/test.jpg` → принимается.

- [ ] **Step 7: Финальный grep — не осталось ли мест с прямым `image_url` без `getRenderUrl`**

Run:
```bash
grep -nE 'src=\{[^}]*image[^}]*\}' components app --include="*.tsx" | grep -vE 'getRenderUrl|preview' | head
```

Ожидаемое: пусто (или только админ-thumbnails которые уже обёрнуты).

- [ ] **Step 8: Push ветки**

```bash
git push -u origin optimize-images
```

---

## Definition of Done

- [ ] `lib/image-url.ts` существует, 12 unit-тестов pass.
- [ ] `lib/image-compress.ts` существует, использует `browser-image-compression`.
- [ ] Все 7 публичных компонентов с `<Image>` используют `getRenderUrl(...)`.
- [ ] `components/admin/image-upload.tsx` и `product-images-editor.tsx` компрессят файлы перед upload + используют `isAllowedImageUrl` для ручной вставки.
- [ ] `mise exec -- pnpm lint && pnpm typecheck && pnpm test` — pass.
- [ ] Dev-сервер: на главной картинки идут через render URL, размер в Network — десятки/сотни КБ.
- [ ] Админ: загрузка тяжёлого JPG → файл в Storage становится сжатым webp.
- [ ] Whitelist URL блокирует чужие домены.
- [ ] Ветка `optimize-images` запушена в origin.

---

## Что НЕ делается в этом плане

- **Backfill старых картинок.** Уже загруженные оригиналы остаются как есть (Storage всё равно их теперь отдаёт через render URL). При следующей перезаливке через админку они автоматически станут сжатыми webp.
- **Server-side `sharp` компрессия.** Не нужна при наличии imgproxy на отдаче и pre-upload компрессии на загрузке.
- **Изменения схемы БД.** Поля `image_url`/`url` хранят полный URL без изменений.
- **Перенос приложения на Timeweb VM.** Это план D, отдельным PR.
