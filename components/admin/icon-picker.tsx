'use client'

import { ICON_NAMES, getIcon } from '@/lib/icons'

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function IconPicker({ value, onChange, label = 'Иконка' }: IconPickerProps) {
  const Preview = getIcon(value)
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Preview className="w-6 h-6" />
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
          {ICON_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
