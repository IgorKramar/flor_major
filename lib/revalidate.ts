import { SITE_CACHE_TAG } from '@/lib/site-data'

export async function revalidateSiteCache(path?: string): Promise<void> {
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: SITE_CACHE_TAG, path: path ?? null }),
    })
  } catch (error) {
    console.error('revalidate error', error)
  }
}
