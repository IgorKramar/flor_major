'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { IconPicker } from '@/components/admin/icon-picker'
import { TypographySection } from '@/components/admin/typography-section'
import { revalidateSiteCache } from '@/lib/revalidate'
import {
  FOOTER_BLOCK_IDS,
  footerSchema,
  socialLinkSchema,
  type FooterBlockId,
} from '@/lib/validation/schemas'
import { getIcon } from '@/lib/icons'
import type { Tables } from '@/lib/database.types'

type SocialLink = Tables<'social_links'>

interface FooterForm {
  brand_display: string
  tagline: string
  copyright_template: string
  background_color: string
  text_color: string
  show_brand: boolean
  show_contacts: boolean
  show_socials: boolean
  block_order: FooterBlockId[]
}

const DEFAULTS: FooterForm = {
  brand_display: 'ФЛОР МАЖОР',
  tagline: 'Создаем настроение цветами',
  copyright_template: '© {{year}} Флор Мажор. Все права защищены.',
  background_color: '#1a1a1a',
  text_color: '#ffffff',
  show_brand: true,
  show_contacts: true,
  show_socials: true,
  block_order: [...FOOTER_BLOCK_IDS],
}

const BLOCK_LABELS: Record<FooterBlockId, string> = {
  brand: 'Бренд',
  contacts: 'Контакты',
  socials: 'Соцсети',
}

interface SocialFormState {
  platform: string
  url: string
  icon_name: string
  sort_order: string
  is_active: boolean
}

const EMPTY_SOCIAL: SocialFormState = {
  platform: '',
  url: '',
  icon_name: 'Instagram',
  sort_order: '0',
  is_active: true,
}

function normalizeBlockOrder(values: unknown[] | null | undefined): FooterBlockId[] {
  const allowed = new Set<FooterBlockId>(FOOTER_BLOCK_IDS)
  const result: FooterBlockId[] = []
  for (const v of values ?? []) {
    if (typeof v === 'string' && allowed.has(v as FooterBlockId) && !result.includes(v as FooterBlockId)) {
      result.push(v as FooterBlockId)
    }
  }
  for (const id of FOOTER_BLOCK_IDS) {
    if (!result.includes(id)) result.push(id)
  }
  return result
}

export default function FooterPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FooterForm>(DEFAULTS)

  const [socials, setSocials] = useState<SocialLink[]>([])
  const [socialModal, setSocialModal] = useState(false)
  const [editingSocialId, setEditingSocialId] = useState<number | null>(null)
  const [socialForm, setSocialForm] = useState<SocialFormState>(EMPTY_SOCIAL)

  const load = useCallback(async () => {
    const [{ data: footer }, { data: socialData }] = await Promise.all([
      supabase.from('footer_config').select('*').eq('id', 1).maybeSingle(),
      supabase.from('social_links').select('*').order('sort_order'),
    ])
    if (footer) {
      setForm({
        brand_display: footer.brand_display,
        tagline: footer.tagline,
        copyright_template: footer.copyright_template,
        background_color: footer.background_color,
        text_color: footer.text_color,
        show_brand: footer.show_brand ?? true,
        show_contacts: footer.show_contacts ?? true,
        show_socials: footer.show_socials ?? true,
        block_order: normalizeBlockOrder(footer.block_order),
      })
    }
    setSocials(socialData ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  function moveBlock(id: FooterBlockId, direction: -1 | 1) {
    setForm((prev) => {
      const idx = prev.block_order.indexOf(id)
      if (idx === -1) return prev
      const target = idx + direction
      if (target < 0 || target >= prev.block_order.length) return prev
      const next = [...prev.block_order]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...prev, block_order: next }
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = footerSchema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('footer_config')
      .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' })
    if (error) {
      toast.error('Ошибка сохранения')
    } else {
      toast.success('Футер сохранён')
      await revalidateSiteCache('/')
    }
    setSaving(false)
  }

  function openNewSocial() {
    setEditingSocialId(null)
    setSocialForm(EMPTY_SOCIAL)
    setSocialModal(true)
  }

  function openEditSocial(item: SocialLink) {
    setEditingSocialId(item.id)
    setSocialForm({
      platform: item.platform,
      url: item.url,
      icon_name: item.icon_name ?? 'Instagram',
      sort_order: String(item.sort_order ?? 0),
      is_active: item.is_active,
    })
    setSocialModal(true)
  }

  async function saveSocial(e: React.FormEvent) {
    e.preventDefault()
    const parsed = socialLinkSchema.safeParse({
      ...socialForm,
      icon_name: socialForm.icon_name || null,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    const result = editingSocialId
      ? await supabase.from('social_links').update(parsed.data).eq('id', editingSocialId)
      : await supabase.from('social_links').insert(parsed.data)
    if (result.error) {
      toast.error('Ошибка сохранения')
      return
    }
    toast.success(editingSocialId ? 'Сохранено' : 'Создано')
    setSocialModal(false)
    await revalidateSiteCache('/')
    load()
  }

  async function removeSocial(id: number) {
    if (!confirm('Удалить ссылку?')) return
    const { error } = await supabase.from('social_links').delete().eq('id', id)
    if (error) {
      toast.error('Ошибка удаления')
      return
    }
    toast.success('Удалено')
    await revalidateSiteCache('/')
    load()
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
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Футер</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Настройка нижней части сайта, блоков и соцсетей
        </p>
      </div>

      <TypographySection scope="footer" />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Основные тексты</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название бренда
            </label>
            <input
              type="text"
              value={form.brand_display}
              onChange={(e) => setForm({ ...form, brand_display: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Слоган</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Шаблон копирайта (используйте {`{{year}}`})
            </label>
            <input
              type="text"
              value={form.copyright_template}
              onChange={(e) =>
                setForm({ ...form, copyright_template: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фон</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={form.background_color}
                  onChange={(e) =>
                    setForm({ ...form, background_color: e.target.value })
                  }
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.background_color}
                  onChange={(e) =>
                    setForm({ ...form, background_color: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Текст</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.text_color}
                  onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Блоки футера</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BlockToggle
              label="Бренд"
              checked={form.show_brand}
              onChange={(v) => setForm({ ...form, show_brand: v })}
            />
            <BlockToggle
              label="Контакты"
              checked={form.show_contacts}
              onChange={(v) => setForm({ ...form, show_contacts: v })}
            />
            <BlockToggle
              label="Соцсети"
              checked={form.show_socials}
              onChange={(v) => setForm({ ...form, show_socials: v })}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Порядок блоков</p>
            <ul className="space-y-2">
              {form.block_order.map((id, idx) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <span className="text-sm text-gray-800">
                    {idx + 1}. {BLOCK_LABELS[id]}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(id, -1)}
                      disabled={idx === 0}
                      className="p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Выше"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(id, 1)}
                      disabled={idx === form.block_order.length - 1}
                      className="p-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Ниже"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Соцсети</h2>
            <p className="text-xs text-gray-500">Ссылки в футере и блоке контактов</p>
          </div>
          <button
            type="button"
            onClick={openNewSocial}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>

        {socials.length === 0 ? (
          <p className="text-sm text-gray-500">Пока пусто</p>
        ) : (
          <ul className="space-y-2">
            {socials.map((item) => {
              const Icon = getIcon(item.icon_name)
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.platform}</p>
                    <p className="text-xs text-gray-500 truncate">{item.url}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      item.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.is_active ? 'Активна' : 'Скрыта'}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditSocial(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      aria-label="Редактировать"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSocial(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {socialModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={saveSocial} className="p-5 sm:p-6 space-y-4">
              <h2 className="text-2xl font-bold">
                {editingSocialId ? 'Редактировать' : 'Новая соцсеть'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Платформа *
                </label>
                <input
                  type="text"
                  required
                  value={socialForm.platform}
                  onChange={(e) =>
                    setSocialForm({ ...socialForm, platform: e.target.value })
                  }
                  placeholder="Instagram, Telegram, WhatsApp..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                <input
                  type="url"
                  required
                  value={socialForm.url}
                  onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <IconPicker
                value={socialForm.icon_name}
                onChange={(icon) => setSocialForm({ ...socialForm, icon_name: icon })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={socialForm.sort_order}
                  onChange={(e) =>
                    setSocialForm({ ...socialForm, sort_order: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={socialForm.is_active}
                  onChange={(e) =>
                    setSocialForm({ ...socialForm, is_active: e.target.checked })
                  }
                />
                <span className="text-sm">Активна</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSocialModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  {editingSocialId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function BlockToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  )
}
