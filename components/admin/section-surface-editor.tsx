'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ColorPickerField } from '@/components/admin/color-picker-field'
import { ImageUpload } from '@/components/admin/image-upload'
import {
  LANDING_SECTION_LABELS,
  type LandingSectionKey,
} from '@/lib/landing-section-theme'
import { revalidateSiteCache } from '@/lib/revalidate'
import {
  landingSectionStyleSchema,
  type LandingSectionStyleInput,
} from '@/lib/validation/schemas'
import type { Tables } from '@/lib/database.types'

type Row = Tables<'landing_section_styles'>

type SurfaceForm = Omit<LandingSectionStyleInput, 'section_key'>

function isHex6(s: string | null | undefined): boolean {
  return Boolean(s && /^#[0-9a-fA-F]{6}$/i.test(s.trim()))
}

function rowToForm(row: Row | null): SurfaceForm {
  if (!row) {
    return {
      background_mode: 'default',
      background_solid_hex: null,
      background_gradient_from_hex: null,
      background_gradient_to_hex: null,
      background_gradient_angle: 135,
      background_image_url: null,
      background_image_overlay: 0.45,
      foreground: null,
      muted_foreground: null,
      card: null,
      primary_color: null,
      primary_foreground: null,
    }
  }
  return {
    background_mode: (row.background_mode as SurfaceForm['background_mode']) ?? 'default',
    background_solid_hex: row.background_solid_hex,
    background_gradient_from_hex: row.background_gradient_from_hex,
    background_gradient_to_hex: row.background_gradient_to_hex,
    background_gradient_angle: row.background_gradient_angle ?? 135,
    background_image_url: row.background_image_url,
    background_image_overlay: Number(row.background_image_overlay ?? 0.45),
    foreground: row.foreground,
    muted_foreground: row.muted_foreground,
    card: row.card,
    primary_color: row.primary_color,
    primary_foreground: row.primary_foreground,
  }
}

export function SectionSurfaceEditor({ sectionKey }: { sectionKey: LandingSectionKey }) {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SurfaceForm>(() => rowToForm(null))

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('landing_section_styles')
      .select('*')
      .eq('section_key', sectionKey)
      .maybeSingle()
    if (error) {
      toast.error('Не удалось загрузить оформление секции')
      setLoading(false)
      return
    }
    setForm(rowToForm(data as Row | null))
    setLoading(false)
  }, [supabase, sectionKey])

  useEffect(() => {
    load()
  }, [load])

  function setMode(next: SurfaceForm['background_mode']) {
    setForm((prev) => ({
      ...prev,
      background_mode: next,
      background_solid_hex:
        next === 'solid' && !isHex6(prev.background_solid_hex)
          ? '#f8fafc'
          : prev.background_solid_hex,
      background_gradient_from_hex:
        next === 'gradient' && !isHex6(prev.background_gradient_from_hex)
          ? '#e2e8f0'
          : prev.background_gradient_from_hex,
      background_gradient_to_hex:
        next === 'gradient' && !isHex6(prev.background_gradient_to_hex)
          ? '#0f172a'
          : prev.background_gradient_to_hex,
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const f = form
    if (f.background_mode === 'solid' && !isHex6(f.background_solid_hex)) {
      toast.error('Выберите цвет фона')
      return
    }
    if (
      f.background_mode === 'gradient' &&
      (!isHex6(f.background_gradient_from_hex) || !isHex6(f.background_gradient_to_hex))
    ) {
      toast.error('Выберите оба цвета градиента')
      return
    }
    if (f.background_mode === 'image' && !(f.background_image_url && f.background_image_url.trim())) {
      toast.error('Загрузите или укажите изображение фона')
      return
    }

    const payload = {
      section_key: sectionKey,
      ...f,
      background_image_url: f.background_image_url?.trim() || null,
    }
    const parsed = landingSectionStyleSchema.safeParse(payload)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('landing_section_styles')
      .upsert(parsed.data, { onConflict: 'section_key' })
    if (error) {
      toast.error('Ошибка сохранения')
    } else {
      toast.success('Оформление секции на главной сохранено')
      await revalidateSiteCache('/')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  const label = LANDING_SECTION_LABELS[sectionKey]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Как выглядит блок на главной</h2>
        <p className="text-sm text-gray-600 mt-1">
          Секция «{label}» на главной странице. Здесь только фон и цвета этой полосы; общая тема
          сайта по-прежнему в разделе «Брендинг».
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Фон секции</label>
          <select
            value={form.background_mode}
            onChange={(e) => setMode(e.target.value as SurfaceForm['background_mode'])}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
          >
            <option value="default">Как в общей теме сайта</option>
            <option value="solid">Сплошной цвет</option>
            <option value="gradient">Градиент (два цвета)</option>
            <option value="image">Картинка</option>
          </select>
        </div>

        {form.background_mode === 'solid' && (
          <ColorPickerField
            label="Цвет фона"
            value={form.background_solid_hex}
            onChange={(v) => setForm((p) => ({ ...p, background_solid_hex: v }))}
            initialHex="#f1f5f9"
          />
        )}

        {form.background_mode === 'gradient' && (
          <div className="space-y-3 rounded-lg border border-gray-100 p-3 bg-gray-50/50">
            <ColorPickerField
              label="Первый цвет градиента"
              value={form.background_gradient_from_hex}
              onChange={(v) => setForm((p) => ({ ...p, background_gradient_from_hex: v }))}
              initialHex="#e2e8f0"
            />
            <ColorPickerField
              label="Второй цвет градиента"
              value={form.background_gradient_to_hex}
              onChange={(v) => setForm((p) => ({ ...p, background_gradient_to_hex: v }))}
              initialHex="#1e293b"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Угол градиента: {form.background_gradient_angle}°
              </label>
              <input
                type="range"
                min={0}
                max={360}
                value={form.background_gradient_angle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, background_gradient_angle: Number(e.target.value) }))
                }
                className="w-full max-w-md"
              />
            </div>
          </div>
        )}

        {form.background_mode === 'image' && (
          <div className="space-y-3">
            <ImageUpload
              label="Фоновое изображение"
              value={form.background_image_url}
              onChange={(url) => setForm((p) => ({ ...p, background_image_url: url }))}
              folder="landing-sections"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Затемнение поверх фото: {Math.round(form.background_image_overlay * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(form.background_image_overlay * 100)}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    background_image_overlay: Number(e.target.value) / 100,
                  }))
                }
                className="w-full max-w-md"
              />
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-0">
          <p className="text-sm font-medium text-gray-800 mb-2">Цвета текста и акцентов в секции</p>
          <p className="text-xs text-gray-500 mb-3">
            Если оставить «Как в общей теме», подставятся цвета из раздела «Брендинг».
          </p>
          <ColorPickerField
            label="Основной текст"
            value={form.foreground}
            onChange={(v) => setForm((p) => ({ ...p, foreground: v }))}
            initialHex="#1e293b"
          />
          <ColorPickerField
            label="Второстепенный текст"
            value={form.muted_foreground}
            onChange={(v) => setForm((p) => ({ ...p, muted_foreground: v }))}
            initialHex="#64748b"
          />
          <ColorPickerField
            label="Фон карточек внутри секции"
            value={form.card}
            onChange={(v) => setForm((p) => ({ ...p, card: v }))}
            initialHex="#ffffff"
          />
          <ColorPickerField
            label="Акцент (кнопки, ссылки)"
            value={form.primary_color}
            onChange={(v) => setForm((p) => ({ ...p, primary_color: v }))}
            initialHex="#c41e3a"
          />
          <ColorPickerField
            label="Текст на акцентных кнопках"
            value={form.primary_foreground}
            onChange={(v) => setForm((p) => ({ ...p, primary_foreground: v }))}
            initialHex="#ffffff"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение…' : 'Сохранить оформление'}
          </button>
        </div>
      </form>
    </div>
  )
}
