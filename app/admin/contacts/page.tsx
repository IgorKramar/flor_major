'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Save, Phone, MapPin, Mail, Clock } from 'lucide-react'

interface ContactSettings {
  phone: string
  phoneSecondary: string
  email: string
  address: string
  workingHours: string
  whatsapp: string
  telegram: string
}

export default function ContactsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<ContactSettings>({
    phone: '+7 (933) 303-39-42',
    phoneSecondary: '+7 (913) 975-76-12',
    email: 'info@flormajor.ru',
    address: 'г. Омск, ул. Карла Маркса, 50',
    workingHours: 'Ежедневно. Круглосуточно.',
    whatsapp: '+79333033942',
    telegram: '@flormajor',
  })

  useEffect(() => {
    loadContacts()
  }, [])

  async function loadContacts() {
    try {
      const { data, error } = await supabase.from('site_config').select('*')

      if (error) throw error

      if (data && data.length > 0) {
        const configObj: Record<string, string> = {}
        data.forEach((row: { config_key: string; config_value: string }) => {
          configObj[row.config_key] = row.config_value
        })

        setContacts({
          phone: configObj['phone'] || contacts.phone,
          phoneSecondary: configObj['phone_secondary'] || contacts.phoneSecondary,
          email: configObj['email'] || contacts.email,
          address: configObj['address'] || contacts.address,
          workingHours: configObj['working_hours'] || contacts.workingHours,
          whatsapp: configObj['whatsapp'] || contacts.whatsapp,
          telegram: configObj['telegram'] || contacts.telegram,
        })
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const updates = [
        { config_key: 'phone', config_value: contacts.phone },
        { config_key: 'phone_secondary', config_value: contacts.phoneSecondary },
        { config_key: 'email', config_value: contacts.email },
        { config_key: 'address', config_value: contacts.address },
        { config_key: 'working_hours', config_value: contacts.workingHours },
        { config_key: 'whatsapp', config_value: contacts.whatsapp },
        { config_key: 'telegram', config_value: contacts.telegram },
      ]

      for (const update of updates) {
        const { error } = await supabase.from('site_config').upsert(update, {
          onConflict: 'config_key',
        })
        if (error) throw error
      }

      toast.success('Контакты сохранены')
    } catch (error) {
      console.error('Error saving contacts:', error)
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Контакты</h1>
        <p className="text-gray-600 mt-1">Настройка контактной информации</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Телефоны</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Основной телефон
              </label>
              <input
                type="tel"
                value={contacts.phone}
                onChange={(e) => setContacts({ ...contacts, phone: e.target.value })}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дополнительный телефон
              </label>
              <input
                type="tel"
                value={contacts.phoneSecondary}
                onChange={(e) => setContacts({ ...contacts, phoneSecondary: e.target.value })}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Email & Messengers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Email и мессенджеры</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={contacts.email}
                onChange={(e) => setContacts({ ...contacts, email: e.target.value })}
                placeholder="info@flormajor.ru"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp
              </label>
              <input
                type="text"
                value={contacts.whatsapp}
                onChange={(e) => setContacts({ ...contacts, whatsapp: e.target.value })}
                placeholder="+79333033942"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telegram
              </label>
              <input
                type="text"
                value={contacts.telegram}
                onChange={(e) => setContacts({ ...contacts, telegram: e.target.value })}
                placeholder="@flormajor"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Адрес и время работы</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={contacts.address}
                  onChange={(e) => setContacts({ ...contacts, address: e.target.value })}
                  placeholder="г. Омск, ул. Карла Маркса, 50"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Время работы
                </label>
                <input
                  type="text"
                  value={contacts.workingHours}
                  onChange={(e) => setContacts({ ...contacts, workingHours: e.target.value })}
                  placeholder="Ежедневно. Круглосуточно."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Предпросмотр</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Адрес</h3>
                <p className="text-sm text-gray-600 mt-1">{contacts.address}</p>
                <p className="text-xs text-gray-500 mt-1">{contacts.workingHours}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Телефон</h3>
                <p className="text-sm text-gray-600 mt-1">{contacts.phone}</p>
                {contacts.phoneSecondary && (
                  <p className="text-xs text-gray-500 mt-1">{contacts.phoneSecondary}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Связь</h3>
                <p className="text-sm text-gray-600 mt-1">{contacts.email}</p>
                <p className="text-xs text-gray-500 mt-1">WhatsApp / Telegram</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
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
