'use client'

import { cn } from '@/lib/utils'

type Props = {
  label: string
  /** #RRGGBB or null/undefined when optional and “use global theme” */
  value: string | null | undefined
  onChange: (next: string | null) => void
  /** If false, always shows a picker (global branding and similar). */
  optional?: boolean
  /** When optional and user clicks «Свой цвет», this value is applied first. */
  initialHex?: string
  className?: string
}

const DISPLAY_FALLBACK = '#94a3b8'

function isHex6(v: string | null | undefined): v is string {
  return Boolean(v && /^#[0-9a-fA-F]{6}$/i.test(v.trim()))
}

export function ColorPickerField({
  label,
  value,
  onChange,
  optional = true,
  initialHex = '#c89f9f',
  className,
}: Props) {
  const active = optional ? isHex6(value) : true
  const hex = isHex6(value) ? value.trim() : DISPLAY_FALLBACK

  if (!optional) {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input
          type="color"
          value={isHex6(value) ? value.trim() : initialHex}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-20 rounded-lg border border-gray-300 cursor-pointer bg-white"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 py-2 border-b border-gray-100 last:border-0',
        className,
      )}
    >
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {!active ? (
          <button
            type="button"
            onClick={() => onChange(initialHex)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Свой цвет…
          </button>
        ) : (
          <>
            <input
              type="color"
              value={hex}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-20 rounded-lg border border-gray-300 cursor-pointer bg-white"
              aria-label={label}
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-sm text-gray-600 underline decoration-dotted hover:text-gray-900"
            >
              Как в общей теме
            </button>
          </>
        )}
      </div>
    </div>
  )
}
