'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Save, RotateCcw, Type } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { revalidateSiteCache } from '@/lib/revalidate'
import {
  TYPO_SCOPES,
  FONT_FAMILY_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  TEXT_TRANSFORM_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  type TypoScopeDef,
  type TypoElementDef,
} from '@/lib/typography-registry'
import { typographySchema, type TypographyInput } from '@/lib/validation/schemas'
import type { TypographyRow } from '@/lib/supabase'

interface FormRow {
  scope: string
  element_key: string
  font_family: string
  font_size: string
  font_weight: string
  line_height: string
  letter_spacing: string
  text_transform: string
  text_align: string
  color: string
}

function emptyRow(scope: string, element_key: string): FormRow {
  return {
    scope,
    element_key,
    font_family: '',
    font_size: '',
    font_weight: '',
    line_height: '',
    letter_spacing: '',
    text_transform: '',
    text_align: '',
    color: '',
  }
}

function rowFromDb(row: TypographyRow): FormRow {
  return {
    scope: row.scope,
    element_key: row.element_key,
    font_family: row.font_family ?? '',
    font_size: row.font_size ?? '',
    font_weight: row.font_weight ?? '',
    line_height: row.line_height ?? '',
    letter_spacing: row.letter_spacing ?? '',
    text_transform: row.text_transform ?? '',
    text_align: row.text_align ?? '',
    color: row.color ?? '',
  }
}

function buildPreviewStyle(row: FormRow): React.CSSProperties {
  const style: React.CSSProperties = {}
  if (row.font_family.trim()) {
    const f = row.font_family.trim()
    style.fontFamily = f.includes(',') ? f : `'${f}', serif`
  }
  if (row.font_size.trim()) style.fontSize = row.font_size.trim()
  if (row.font_weight.trim()) style.fontWeight = row.font_weight.trim() as React.CSSProperties['fontWeight']
  if (row.line_height.trim()) style.lineHeight = row.line_height.trim()
  if (row.letter_spacing.trim()) style.letterSpacing = row.letter_spacing.trim()
  if (row.text_transform.trim()) style.textTransform = row.text_transform.trim() as React.CSSProperties['textTransform']
  if (row.text_align.trim()) style.textAlign = row.text_align.trim() as React.CSSProperties['textAlign']
  if (row.color.trim()) style.color = row.color.trim()
  return style
}

export default function TypographyPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeScope, setActiveScope] = useState<string>(TYPO_SCOPES[0]?.scope ?? '')
  const [rows, setRows] = useState<Record<string, FormRow>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  const keyOf = (scope: string, element_key: string) => `${scope}:${element_key}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('typography_settings').select('*')
      if (error) throw error

      const next: Record<string, FormRow> = {}
      for (const scope of TYPO_SCOPES) {
        for (const element of scope.elements) {
          next[keyOf(scope.scope, element.key)] = emptyRow(scope.scope, element.key)
        }
      }
      for (const row of data ?? []) {
        next[keyOf(row.scope, row.element_key)] = rowFromDb(row)
      }
      setRows(next)
      setDirty(new Set())
    } catch (error) {
      console.error(error)
      toast.error('Не удалось загрузить настройки типографики')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const updateField = (scope: string, element_key: string, field: keyof FormRow, value: string) => {
    const key = keyOf(scope, element_key)
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
    setDirty((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  const resetElement = (scope: string, element_key: string) => {
    const key = keyOf(scope, element_key)
    setRows((prev) => ({
      ...prev,
      [key]: emptyRow(scope, element_key),
    }))
    setDirty((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  const activeScopeDef: TypoScopeDef | undefined = useMemo(
    () => TYPO_SCOPES.find((s) => s.scope === activeScope),
    [activeScope],
  )

  const handleSave = async () => {
    if (dirty.size === 0) {
      toast.info('Нет изменений')
      return
    }
    setSaving(true)
    try {
      const payloads: TypographyInput[] = []
      for (const key of dirty) {
        const row = rows[key]
        if (!row) continue
        const parsed = typographySchema.safeParse(row)
        if (!parsed.success) {
          toast.error(`${row.scope}/${row.element_key}: ${parsed.error.issues[0]?.message}`)
          setSaving(false)
          return
        }
        payloads.push(parsed.data)
      }
      const { error } = await supabase
        .from('typography_settings')
        .upsert(payloads, { onConflict: 'scope,element_key' })
      if (error) throw error
      toast.success(`Сохранено: ${payloads.length}`)
      setDirty(new Set())
      await revalidateSiteCache('/')
      await revalidateSiteCache('/catalog')
    } catch (error) {
      console.error(error)
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <Type className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            Типографика
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Настройки шрифтов, размеров и стилей для каждого текстового блока на сайте
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || dirty.size === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Сохранение…' : `Сохранить${dirty.size > 0 ? ` (${dirty.size})` : ''}`}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {TYPO_SCOPES.map((scope) => {
          const isActive = scope.scope === activeScope
          const dirtyCount = Array.from(dirty).filter((k) => k.startsWith(`${scope.scope}:`)).length
          return (
            <button
              key={scope.scope}
              type="button"
              onClick={() => setActiveScope(scope.scope)}
              className={`relative whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {scope.label}
              {dirtyCount > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs rounded-full ${
                    isActive ? 'bg-white text-primary' : 'bg-primary text-white'
                  }`}
                >
                  {dirtyCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeScopeDef && (
        <div className="space-y-4">
          {activeScopeDef.elements.map((element) => (
            <ElementEditor
              key={element.key}
              scopeDef={activeScopeDef}
              element={element}
              row={rows[keyOf(activeScopeDef.scope, element.key)]}
              isDirty={dirty.has(keyOf(activeScopeDef.scope, element.key))}
              onChange={(field, value) => updateField(activeScopeDef.scope, element.key, field, value)}
              onReset={() => resetElement(activeScopeDef.scope, element.key)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ElementEditorProps {
  scopeDef: TypoScopeDef
  element: TypoElementDef
  row: FormRow | undefined
  isDirty: boolean
  onChange: (field: keyof FormRow, value: string) => void
  onReset: () => void
}

function ElementEditor({ scopeDef, element, row, isDirty, onChange, onReset }: ElementEditorProps) {
  if (!row) return null
  const previewStyle = buildPreviewStyle(row)

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">
            {element.label}
            {isDirty && <span className="ml-2 text-xs text-primary">● изменено</span>}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {scopeDef.scope} / {element.key}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="self-start inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          title="Сбросить все поля"
        >
          <RotateCcw className="w-3 h-3" />
          Сбросить
        </button>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 overflow-hidden">
        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">Предпросмотр</p>
        <div style={previewStyle} className="wrap-break-word">
          {element.sampleText}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Шрифт">
          <input
            type="text"
            list={`font-families-${scopeDef.scope}-${element.key}`}
            value={row.font_family}
            onChange={(e) => onChange('font_family', e.target.value)}
            placeholder="Cormorant Garamond"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
          <datalist id={`font-families-${scopeDef.scope}-${element.key}`}>
            {FONT_FAMILY_OPTIONS.map((family) => (
              <option key={family} value={family} />
            ))}
          </datalist>
        </Field>

        <Field label="Размер" hint="например, 1.25rem или 20px">
          <input
            type="text"
            value={row.font_size}
            onChange={(e) => onChange('font_size', e.target.value)}
            placeholder="1rem"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </Field>

        <Field label="Начертание">
          <select
            value={row.font_weight}
            onChange={(e) => onChange('font_weight', e.target.value)}
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
            onChange={(e) => onChange('line_height', e.target.value)}
            placeholder="1.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </Field>

        <Field label="Межбуквенный интервал" hint="0.02em или нормальный (normal)">
          <input
            type="text"
            value={row.letter_spacing}
            onChange={(e) => onChange('letter_spacing', e.target.value)}
            placeholder="normal"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </Field>

        <Field label="Регистр">
          <select
            value={row.text_transform}
            onChange={(e) => onChange('text_transform', e.target.value)}
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
            onChange={(e) => onChange('text_align', e.target.value)}
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
              onChange={(e) => onChange('color', e.target.value)}
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
