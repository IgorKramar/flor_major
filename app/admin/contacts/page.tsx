'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save, Phone, MapPin, Mail } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { revalidateSiteCache } from '@/lib/revalidate'
import { contactInfoSchema } from '@/lib/validation/schemas'

interface ContactForm {
  phone_primary: string
  phone_secondary: string
  email: string
  address: string
  working_hours: string
  whatsapp: string
  telegram: string
  postal_code: string
  address_region: string
  address_locality: string
  address_country: string
  geo_lat: string
  geo_lng: string
}

const DEFAULTS: ContactForm = {
  phone_primary: '',
  phone_secondary: '',
  email: '',
  address: '',
  working_hours: '',
  whatsapp: '',
  telegram: '',
  postal_code: '',
  address_region: '',
  address_locality: '',
  address_country: 'RU',
  geo_lat: '',
  geo_lng: '',
}

export default function ContactsPage() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ContactForm>(DEFAULTS)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('contact_info')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    if (data) {
      setForm({
        phone_primary: data.phone_primary ?? '',
        phone_secondary: data.phone_secondary ?? '',
        email: data.email ?? '',
        address: data.address ?? '',
        working_hours: data.working_hours ?? '',
        whatsapp: data.whatsapp ?? '',
        telegram: data.telegram ?? '',
        postal_code: data.postal_code ?? '',
        address_region: data.address_region ?? '',
        address_locality: data.address_locality ?? '',
        address_country: data.address_country ?? 'RU',
        geo_lat: data.geo_lat != null ? String(data.geo_lat) : '',
        geo_lng: data.geo_lng != null ? String(data.geo_lng) : '',
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = contactInfoSchema.safeParse({
      phone_primary: form.phone_primary,
      phone_secondary: form.phone_secondary || null,
      email: form.email,
      address: form.address,
      working_hours: form.working_hours,
      whatsapp: form.whatsapp || null,
      telegram: form.telegram || null,
      postal_code: form.postal_code || null,
      address_region: form.address_region || null,
      address_locality: form.address_locality || null,
      address_country: form.address_country || null,
      geo_lat: form.geo_lat || null,
      geo_lng: form.geo_lng || null,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('contact_info')
        .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' })
      if (error) throw error
      toast.success('Контакты сохранены')
      await revalidateSiteCache('/')
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
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Контакты</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Настройка контактной информации</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Телефоны</h2>
            </div>
            <Field
              label="Основной телефон"
              value={form.phone_primary}
              onChange={(v) => setForm({ ...form, phone_primary: v })}
              placeholder="+7 (___) ___-__-__"
            />
            <Field
              label="Дополнительный телефон"
              value={form.phone_secondary}
              onChange={(v) => setForm({ ...form, phone_secondary: v })}
              placeholder="+7 (___) ___-__-__"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Email и мессенджеры
              </h2>
            </div>
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Field
              label="WhatsApp (URL или номер)"
              value={form.whatsapp}
              onChange={(v) => setForm({ ...form, whatsapp: v })}
            />
            <Field
              label="Telegram (URL или @username)"
              value={form.telegram}
              onChange={(v) => setForm({ ...form, telegram: v })}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Адрес и график
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Field
                label="Адрес"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
              />
              <Field
                label="Время работы"
                value={form.working_hours}
                onChange={(v) => setForm({ ...form, working_hours: v })}
              />
              <Field
                label="Регион"
                value={form.address_region}
                onChange={(v) => setForm({ ...form, address_region: v })}
              />
              <Field
                label="Город"
                value={form.address_locality}
                onChange={(v) => setForm({ ...form, address_locality: v })}
              />
              <Field
                label="Индекс"
                value={form.postal_code}
                onChange={(v) => setForm({ ...form, postal_code: v })}
              />
              <Field
                label="Страна (ISO)"
                value={form.address_country}
                onChange={(v) => setForm({ ...form, address_country: v })}
              />
              <Field
                label="Широта"
                value={form.geo_lat}
                onChange={(v) => setForm({ ...form, geo_lat: v })}
              />
              <Field
                label="Долгота"
                value={form.geo_lng}
                onChange={(v) => setForm({ ...form, geo_lng: v })}
              />
            </div>
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
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}

function Field({ label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
      />
    </div>
  )
}
