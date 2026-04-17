'use client'

import { useRef, useState } from 'react'
import { Upload, X, Link as LinkIcon } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  folder?: string
  label?: string
}

export function ImageUpload({
  value,
  onChange,
  folder = 'misc',
  label = 'Изображение',
}: ImageUploadProps) {
  const { supabase } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [manualUrl, setManualUrl] = useState(value ?? '')

  const handleUpload = async (file: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл больше 5 МБ')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage
        .from('media')
        .upload(path, file, { cacheControl: '31536000', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      onChange(data.publicUrl)
      setManualUrl(data.publicUrl)
      toast.success('Изображение загружено')
    } catch (error) {
      console.error('upload error', error)
      toast.error('Не удалось загрузить файл')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        {value ? (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <Image
              src={value}
              alt="preview"
              fill
              sizes="128px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setManualUrl('')
              }}
              className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-gray-100"
              aria-label="Удалить изображение"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
            <Upload className="w-6 h-6" />
          </div>
        )}

        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="или вставьте URL"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(manualUrl || null)}
              className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
