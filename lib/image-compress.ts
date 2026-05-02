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
