'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { revalidateSiteCache } from '@/lib/revalidate'
import { TYPO_SCOPES } from '@/lib/typography-registry'
import { useTypographyEditor, type TypographyEditor } from '@/lib/hooks/use-typography-editor'
import { TypographyPanel } from '@/components/admin/typography-panel'

interface TypographySectionProps {
  scope: string
  title?: string
  /** Пути, которые нужно ревалидировать после сохранения. По-умолчанию `/`. */
  revalidatePaths?: string[]
  /** Чтобы родитель мог запускать сохранение в общем flow. */
  onEditorReady?: (editor: TypographyEditor) => void
}

export function TypographySection({
  scope,
  title,
  revalidatePaths = ['/'],
  onEditorReady,
}: TypographySectionProps) {
  const scopeDef = TYPO_SCOPES.find((s) => s.scope === scope)
  const elementKeys = scopeDef?.elements.map((el) => el.key) ?? []
  const editor = useTypographyEditor({ scope, elementKeys })
  const [saving, setSaving] = useState(false)

  if (onEditorReady && !editor.loading) onEditorReady(editor)

  if (!scopeDef) return null

  async function handleSave() {
    setSaving(true)
    try {
      const result = await editor.save()
      if (result.errors.length) {
        result.errors.forEach((m) => toast.error(m))
        return
      }
      if (result.saved === 0) {
        toast.info('Нет изменений')
        return
      }
      toast.success(`Сохранено блоков: ${result.saved}`)
      await Promise.all(revalidatePaths.map((p) => revalidateSiteCache(p)))
    } catch (error) {
      console.error(error)
      toast.error('Ошибка сохранения типографики')
    } finally {
      setSaving(false)
    }
  }

  if (editor.loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 text-sm text-gray-500">
        Загрузка типографики…
      </div>
    )
  }

  return (
    <details className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <summary className="cursor-pointer font-semibold text-gray-900">
        {title ?? `Типографика: ${scopeDef.label}`}
        {editor.dirtyCount > 0 && (
          <span className="ml-2 text-xs text-primary">
            ● изменено ({editor.dirtyCount})
          </span>
        )}
      </summary>
      <div className="mt-4 space-y-3">
        {scopeDef.elements.map((element) => (
          <TypographyPanel
            key={element.key}
            editor={editor}
            elementKey={element.key}
            label={element.label}
            previewText={element.sampleText}
          />
        ))}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || editor.dirtyCount === 0}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : 'Сохранить типографику'}
          </button>
        </div>
      </div>
    </details>
  )
}
