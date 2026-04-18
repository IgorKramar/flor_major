'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

export interface EditorImage {
  id?: number
  url: string
  alt: string | null
  sort_order: number
  is_primary: boolean
}

interface ProductImagesEditorProps {
  value: EditorImage[]
  onChange: (next: EditorImage[]) => void
  folder?: string
}

export function ProductImagesEditor({
  value,
  onChange,
  folder = 'products',
}: ProductImagesEditorProps) {
  const { supabase } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return
    setUploading(true)
    try {
      const uploaded: EditorImage[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) {
          toast.error(`Пропущено: ${file.name} — не изображение`)
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Пропущено: ${file.name} — больше 5 МБ`)
          continue
        }
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error } = await supabase.storage
          .from('media')
          .upload(path, file, { cacheControl: '31536000', upsert: false })
        if (error) {
          console.error(error)
          toast.error(`Не удалось загрузить ${file.name}`)
          continue
        }
        const { data } = supabase.storage.from('media').getPublicUrl(path)
        uploaded.push({
          url: data.publicUrl,
          alt: null,
          sort_order: value.length + uploaded.length,
          is_primary: value.length === 0 && uploaded.length === 0,
        })
      }
      if (uploaded.length > 0) {
        onChange([...value, ...uploaded])
        toast.success(`Загружено: ${uploaded.length}`)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const reindex = (items: EditorImage[]): EditorImage[] =>
    items.map((it, idx) => ({ ...it, sort_order: idx }))

  const move = (index: number, direction: -1 | 1) => {
    const next = [...value]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(reindex(next))
  }

  const remove = (index: number) => {
    const next = value.filter((_, i) => i !== index)
    if (!next.some((it) => it.is_primary) && next.length > 0) {
      next[0].is_primary = true
    }
    onChange(reindex(next))
  }

  const makePrimary = (index: number) => {
    const next = value.map((it, i) => ({ ...it, is_primary: i === index }))
    onChange(next)
  }

  const updateAlt = (index: number, alt: string) => {
    const next = value.map((it, i) => (i === index ? { ...it, alt: alt || null } : it))
    onChange(next)
  }

  const addByUrl = () => {
    const url = prompt('URL изображения')?.trim()
    if (!url) return
    try {
      new URL(url)
    } catch {
      toast.error('Некорректный URL')
      return
    }
    onChange(
      reindex([
        ...value,
        {
          url,
          alt: null,
          sort_order: value.length,
          is_primary: value.length === 0,
        },
      ]),
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Фотографии товара
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addByUrl}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            По URL
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Загрузка…' : 'Загрузить'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
            }}
          />
        </div>
      </div>

      {value.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          Нет загруженных изображений
        </div>
      ) : (
        <ul className="space-y-2">
          {value.map((image, index) => (
            <li
              key={`${image.id ?? 'new'}-${index}`}
              className="flex gap-3 items-start p-3 border border-gray-200 rounded-xl bg-white"
            >
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                <Image
                  src={image.url}
                  alt={image.alt ?? ''}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="text"
                  value={image.alt ?? ''}
                  onChange={(e) => updateAlt(index, e.target.value)}
                  placeholder="Alt-текст для SEO и доступности"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => makePrimary(index)}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                      image.is_primary
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Сделать главной"
                  >
                    <Star className="w-3 h-3" />
                    {image.is_primary ? 'Главная' : 'Сделать главной'}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="p-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Переместить выше"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    className="p-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Переместить ниже"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    Удалить
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
