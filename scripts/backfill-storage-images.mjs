// scripts/backfill-storage-images.mjs
//
// Пересжать все файлы в bucket `media` через Supabase Storage Renderer.
// Скачивает каждый файл через transform { width: 1920, quality: 85 } —
// imgproxy на сервере отдаёт webp. Перезаливает по тому же path с upsert.
//
// Запуск: mise exec -- node scripts/backfill-storage-images.mjs
//
// Требует .env.local с NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Загрузить .env.local руками (Node не делает это автоматически)
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(URL, KEY)
const BUCKET = 'media'
const MAX_DIM = 1920
const QUALITY = 85

async function listAll(prefix = '') {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) throw error
  const out = []
  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id == null) {
      // Папка — рекурсивно
      out.push(...(await listAll(fullPath)))
    } else {
      out.push({ path: fullPath, size: item.metadata?.size ?? 0, mime: item.metadata?.mimetype ?? '' })
    }
  }
  return out
}

async function processFile(file) {
  // SVG/GIF не трогаем — векторы/анимации испортятся
  if (file.mime.includes('svg') || file.mime.includes('gif')) {
    return { skipped: `mime ${file.mime}` }
  }

  // Прямой fetch на render endpoint. Accept: image/webp триггерит imgproxy
  // автоматически конвертировать в webp (IMGPROXY_ENABLE_WEBP_DETECTION=true в .env).
  // Параметр format=webp в URL не поддерживается Storage Renderer.
  const renderUrl = `${URL}/storage/v1/render/image/public/${BUCKET}/${file.path}?width=${MAX_DIM}&quality=${QUALITY}`
  const res = await fetch(renderUrl, { headers: { Accept: 'image/webp' } })
  if (!res.ok) {
    throw new Error(`render ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())

  // Если новый webp ≥ оригинала (бывает на очень маленьких картинках) — пропустим
  if (buf.length >= file.size) {
    return {
      skipped: `webp ${(buf.length / 1024).toFixed(0)}KB ≥ original ${(file.size / 1024).toFixed(0)}KB`,
    }
  }

  // Перезаливаем по тому же path
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(file.path, buf, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: '31536000',
  })
  if (upErr) throw upErr

  return {
    original: file.size,
    compressed: buf.length,
    saved: Math.round((1 - buf.length / file.size) * 100),
  }
}

console.log(`Listing ${BUCKET}...`)
const files = await listAll()
console.log(`Found ${files.length} files\n`)

let totalBefore = 0
let totalAfter = 0
let processed = 0
let skipped = 0
let failed = 0

for (const f of files) {
  try {
    const r = await processFile(f)
    if (r.skipped) {
      console.log(`SKIP ${f.path} — ${r.skipped}`)
      skipped++
      continue
    }
    console.log(
      `OK   ${f.path} — ${(r.original / 1024).toFixed(0)} KB → ${(r.compressed / 1024).toFixed(0)} KB (-${r.saved}%)`,
    )
    totalBefore += r.original
    totalAfter += r.compressed
    processed++
  } catch (e) {
    console.error(`FAIL ${f.path} — ${e.message}`)
    failed++
  }
}

console.log(
  `\nDone. processed=${processed} skipped=${skipped} failed=${failed}` +
    `\nTotal size: ${(totalBefore / 1024 / 1024).toFixed(1)} MB → ${(totalAfter / 1024 / 1024).toFixed(1)} MB` +
    `\nSaved: ${totalBefore > 0 ? (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0) : 0}%`,
)
