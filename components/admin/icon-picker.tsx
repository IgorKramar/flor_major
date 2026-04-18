'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { ICON_OPTIONS, getIcon, normalizeIconName, type IconOption } from '@/lib/icons'

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
}

export function IconPicker({ value, onChange, label = 'Иконка', placeholder = 'Выберите иконку' }: IconPickerProps) {
  const normalized = normalizeIconName(value)
  const Preview = getIcon(normalized)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    requestAnimationFrame(() => searchRef.current?.focus())
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ICON_OPTIONS
    return ICON_OPTIONS.filter((opt) => {
      if (opt.label.toLowerCase().includes(q)) return true
      if (opt.id.toLowerCase().includes(q)) return true
      return opt.tags.some((tag) => tag.toLowerCase().includes(q))
    })
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<IconOption['source'], IconOption[]>()
    for (const opt of filtered) {
      const bucket = map.get(opt.source) ?? []
      bucket.push(opt)
      map.set(opt.source, bucket)
    }
    return map
  }, [filtered])

  return (
    <div className="space-y-2" ref={rootRef}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:border-primary/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Preview className="w-5 h-5" />
          </span>
          <span className="flex-1 text-left truncate text-gray-900">
            {normalized ?? placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen ? (
          <div className="absolute z-30 mt-2 w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск: цветок, корзина, сердце..."
                className="w-full text-sm bg-transparent outline-none placeholder:text-gray-400"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">Ничего не найдено</p>
              ) : null}
              {Array.from(grouped.entries()).map(([source, options]) => (
                <div key={source}>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 px-1 mb-1">
                    {source === 'lucide' ? 'Lucide' : 'Phosphor'}
                  </p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {options.map((opt) => {
                      const Icon = opt.component
                      const active = normalized === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onChange(opt.id)
                            setIsOpen(false)
                            setQuery('')
                          }}
                          className={`relative aspect-square rounded-lg border flex items-center justify-center transition-colors ${
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 text-gray-700 hover:border-primary/40 hover:bg-primary/5'
                          }`}
                          title={opt.label}
                          aria-label={opt.label}
                        >
                          <Icon className="w-5 h-5" />
                          {active ? (
                            <Check className="w-3 h-3 absolute top-1 right-1 text-primary" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
