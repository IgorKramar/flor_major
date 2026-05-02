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
