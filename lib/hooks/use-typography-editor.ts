'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { TypographyRow } from '@/lib/supabase'
import { typographySchema, type TypographyInput } from '@/lib/validation/schemas'

export interface FormRow {
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

export function emptyRow(scope: string, element_key: string): FormRow {
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

export function typoRowKey(scope: string, element_key: string): string {
  return `${scope}:${element_key}`
}

interface UseTypographyEditorOptions {
  scope: string
  elementKeys: readonly string[]
}

export function useTypographyEditor({ scope, elementKeys }: UseTypographyEditorOptions) {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Record<string, FormRow>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  const keysSignature = useMemo(() => elementKeys.join('|'), [elementKeys])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('typography_settings')
        .select('*')
        .eq('scope', scope)
      if (error) throw error

      const next: Record<string, FormRow> = {}
      for (const key of elementKeys) {
        next[typoRowKey(scope, key)] = emptyRow(scope, key)
      }
      for (const row of data ?? []) {
        next[typoRowKey(row.scope, row.element_key)] = rowFromDb(row)
      }
      setRows(next)
      setDirty(new Set())
    } finally {
      setLoading(false)
    }
  }, [supabase, scope, keysSignature])

  useEffect(() => {
    load()
  }, [load])

  const updateField = useCallback(
    (element_key: string, field: keyof FormRow, value: string) => {
      const key = typoRowKey(scope, element_key)
      setRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
      setDirty((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
    },
    [scope]
  )

  const resetElement = useCallback(
    (element_key: string) => {
      const key = typoRowKey(scope, element_key)
      setRows((prev) => ({ ...prev, [key]: emptyRow(scope, element_key) }))
      setDirty((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
    },
    [scope]
  )

  const getRow = useCallback(
    (element_key: string): FormRow | undefined => rows[typoRowKey(scope, element_key)],
    [rows, scope]
  )

  const isDirty = useCallback(
    (element_key: string) => dirty.has(typoRowKey(scope, element_key)),
    [dirty, scope]
  )

  const buildPayloads = useCallback((): {
    payloads: TypographyInput[]
    errors: string[]
  } => {
    const payloads: TypographyInput[] = []
    const errors: string[] = []
    for (const key of dirty) {
      const row = rows[key]
      if (!row) continue
      const parsed = typographySchema.safeParse(row)
      if (!parsed.success) {
        errors.push(`${row.scope}/${row.element_key}: ${parsed.error.issues[0]?.message}`)
        continue
      }
      payloads.push(parsed.data)
    }
    return { payloads, errors }
  }, [dirty, rows])

  const save = useCallback(async (): Promise<{ saved: number; errors: string[] }> => {
    if (dirty.size === 0) return { saved: 0, errors: [] }
    const { payloads, errors } = buildPayloads()
    if (errors.length) return { saved: 0, errors }
    const { error } = await supabase
      .from('typography_settings')
      .upsert(payloads, { onConflict: 'scope,element_key' })
    if (error) throw error
    setDirty(new Set())
    return { saved: payloads.length, errors: [] }
  }, [supabase, dirty, buildPayloads])

  return {
    loading,
    dirtyCount: dirty.size,
    isDirty,
    getRow,
    updateField,
    resetElement,
    save,
    reload: load,
  }
}

export type TypographyEditor = ReturnType<typeof useTypographyEditor>
