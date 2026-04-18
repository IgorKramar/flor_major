'use client'

import { useState, type CSSProperties } from 'react'
import { ChevronDown, RotateCcw, Type } from 'lucide-react'
import {
  FONT_FAMILY_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  TEXT_TRANSFORM_OPTIONS,
} from '@/lib/typography-registry'
import type { FormRow, TypographyEditor } from '@/lib/hooks/use-typography-editor'

function buildPreviewStyle(row: FormRow | undefined): CSSProperties {
  if (!row) return {}
  const style: CSSProperties = {}
  if (row.font_family.trim()) {
    const f = row.font_family.trim()
    style.fontFamily = f.includes(',') ? f : `'${f}', serif`
  }
  if (row.font_size.trim()) style.fontSize = row.font_size.trim()
  if (row.font_weight.trim()) style.fontWeight = row.font_weight.trim() as CSSProperties['fontWeight']
  if (row.line_height.trim()) style.lineHeight = row.line_height.trim()
  if (row.letter_spacing.trim()) style.letterSpacing = row.letter_spacing.trim()
  if (row.text_transform.trim())
    style.textTransform = row.text_transform.trim() as CSSProperties['textTransform']
  if (row.text_align.trim())
    style.textAlign = row.text_align.trim() as CSSProperties['textAlign']
  if (row.color.trim()) style.color = row.color.trim()
  return style
}

interface TypographyPanelProps {
  editor: TypographyEditor
  elementKey: string
  label: string
  previewText: string
  onPreviewTextChange?: (value: string) => void
  /** Если true — всегда открыт, без возможности сворачивания. */
  alwaysOpen?: boolean
  /** Начальное состояние (свёрнут/развёрнут). */
  defaultOpen?: boolean
}

export function TypographyPanel({
  editor,
  elementKey,
  label,
  previewText,
  onPreviewTextChange,
  alwaysOpen = false,
  defaultOpen = false,
}: TypographyPanelProps) {
  const [open, setOpen] = useState(defaultOpen || alwaysOpen)
  const row = editor.getRow(elementKey)
  const dirty = editor.isDirty(elementKey)
  const previewStyle = buildPreviewStyle(row)
  const canEditPreview = typeof onPreviewTextChange === 'function'

  if (!row) return null

  const panelId = `typo-panel-${row.scope}-${elementKey}`

  return (
    <section className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (!alwaysOpen) setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <Type className="w-4 h-4 text-primary" />
          Типографика: {label}
          {dirty && <span className="ml-1 text-xs text-primary">● изменено</span>}
        </span>
        {!alwaysOpen && (
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {open && (
        <div id={panelId} className="border-t border-gray-200 p-4 space-y-4">
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Предпросмотр</p>
              <button
                type="button"
                onClick={() => editor.resetElement(elementKey)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                title="Сбросить типографику блока"
              >
                <RotateCcw className="w-3 h-3" />
                Сбросить
              </button>
            </div>
            {canEditPreview ? (
              <input
                type="text"
                value={previewText}
                onChange={(e) => onPreviewTextChange?.(e.target.value)}
                style={previewStyle}
                className="w-full bg-transparent border-0 outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1 wrap-break-word"
              />
            ) : (
              <div style={previewStyle} className="wrap-break-word px-2 py-1">
                {previewText || '—'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Шрифт">
              <select
                value={row.font_family}
                onChange={(e) => editor.updateField(elementKey, 'font_family', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">—</option>
                {FONT_FAMILY_OPTIONS.map((family) => (
                  <option key={family} value={family} style={{ fontFamily: `'${family}', serif` }}>
                    {family}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Размер" hint="например, 1.25rem или 20px">
              <input
                type="text"
                value={row.font_size}
                onChange={(e) => editor.updateField(elementKey, 'font_size', e.target.value)}
                placeholder="1rem"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </Field>

            <Field label="Начертание">
              <select
                value={row.font_weight}
                onChange={(e) => editor.updateField(elementKey, 'font_weight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">—</option>
                {FONT_WEIGHT_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Межстрочный интервал" hint="1.4 или 1.5rem">
              <input
                type="text"
                value={row.line_height}
                onChange={(e) => editor.updateField(elementKey, 'line_height', e.target.value)}
                placeholder="1.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </Field>

            <Field label="Межбуквенный интервал" hint="0.02em или normal">
              <input
                type="text"
                value={row.letter_spacing}
                onChange={(e) => editor.updateField(elementKey, 'letter_spacing', e.target.value)}
                placeholder="normal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </Field>

            <Field label="Регистр">
              <select
                value={row.text_transform}
                onChange={(e) => editor.updateField(elementKey, 'text_transform', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">—</option>
                {TEXT_TRANSFORM_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Выравнивание">
              <select
                value={row.text_align}
                onChange={(e) => editor.updateField(elementKey, 'text_align', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">—</option>
                {TEXT_ALIGN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Цвет" hint="hex (#333) или css-переменная">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={row.color}
                  onChange={(e) => editor.updateField(elementKey, 'color', e.target.value)}
                  placeholder="#1a1a1a"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                {/^#[0-9a-fA-F]{3,8}$/.test(row.color) && (
                  <span
                    className="w-10 h-10 rounded-lg border border-gray-200 shrink-0"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                )}
              </div>
            </Field>
          </div>
        </div>
      )}
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-gray-400">{hint}</span>}
    </label>
  )
}
