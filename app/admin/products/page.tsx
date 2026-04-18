'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  ProductImagesEditor,
  type EditorImage,
} from '@/components/admin/product-images-editor'
import { revalidateSiteCache } from '@/lib/revalidate'
import type { Tables } from '@/lib/database.types'
import { productSchema, type ProductImageInput } from '@/lib/validation/schemas'

type Product = Tables<'products'>
type ProductImage = Tables<'product_images'>
type Category = Tables<'categories'>

interface FormState {
  title: string
  price_amount: string
  price_currency: string
  price_display: string
  description: string
  badge: string
  category_id: string
  slug: string
  is_featured: boolean
  is_available: boolean
  sort_order: string
  images: EditorImage[]
}

const EMPTY_FORM: FormState = {
  title: '',
  price_amount: '',
  price_currency: 'RUB',
  price_display: '',
  description: '',
  badge: '',
  category_id: '',
  slug: '',
  is_featured: false,
  is_available: true,
  sort_order: '0',
  images: [],
}

function formatPrice(product: Product): string {
  if (product.price_display && product.price_display.trim().length > 0) {
    return product.price_display
  }
  if (product.price_amount != null) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: product.price_currency || 'RUB',
      maximumFractionDigits: 0,
    }).format(product.price_amount)
  }
  return product.price ?? ''
}

export default function ProductsPage() {
  const { supabase } = useAuth()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<(Product & { product_images?: ProductImage[] })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
        supabase
          .from('products')
          .select('*, product_images(*)')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      setProducts((productsData ?? []) as typeof products)
      setCategories(categoriesData ?? [])
    } catch (error) {
      console.error(error)
      toast.error('Ошибка загрузки товаров')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingId(null)
      setFormData(EMPTY_FORM)
      setShowModal(true)
    }
  }, [searchParams])

  function openEdit(product: Product & { product_images?: ProductImage[] }) {
    const sorted = [...(product.product_images ?? [])].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      return a.sort_order - b.sort_order
    })
    setEditingId(product.id)
    setFormData({
      title: product.title,
      price_amount:
        product.price_amount != null ? String(product.price_amount) : '',
      price_currency: product.price_currency || 'RUB',
      price_display: product.price_display ?? '',
      description: product.description ?? '',
      badge: product.badge ?? '',
      category_id: product.category_id ? String(product.category_id) : '',
      slug: product.slug ?? '',
      is_featured: product.is_featured,
      is_available: product.is_available,
      sort_order: String(product.sort_order ?? 0),
      images: sorted.map((img, idx) => ({
        id: img.id,
        url: img.url,
        alt: img.alt ?? null,
        sort_order: img.sort_order ?? idx,
        is_primary: img.is_primary,
      })),
    })
    setShowModal(true)
  }

  function openNew() {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  async function syncImages(productId: number, images: ProductImageInput[]) {
    const { data: existing } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
    const existingIds = new Set((existing ?? []).map((row) => row.id))
    const keepIds = new Set<number>()

    const hasPrimary = images.some((img) => img.is_primary)
    const normalized = images.map((img, idx) => ({
      id: img.id,
      url: img.url,
      alt: img.alt ?? null,
      sort_order: idx,
      is_primary: img.is_primary || (!hasPrimary && idx === 0),
    }))

    for (const img of normalized) {
      if (img.id && existingIds.has(img.id)) {
        keepIds.add(img.id)
        const { error } = await supabase
          .from('product_images')
          .update({
            url: img.url,
            alt: img.alt,
            sort_order: img.sort_order,
            is_primary: img.is_primary,
          })
          .eq('id', img.id)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase
          .from('product_images')
          .insert({
            product_id: productId,
            url: img.url,
            alt: img.alt,
            sort_order: img.sort_order,
            is_primary: img.is_primary,
          })
          .select('id')
          .single()
        if (error) throw error
        if (inserted?.id) keepIds.add(inserted.id)
      }
    }

    const toDelete = Array.from(existingIds).filter((id) => !keepIds.has(id))
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .in('id', toDelete)
      if (error) throw error
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = productSchema.safeParse({
      title: formData.title,
      price_amount: formData.price_amount,
      price_currency: formData.price_currency,
      price_display: formData.price_display || null,
      description: formData.description || null,
      badge: formData.badge || null,
      category_id: formData.category_id || null,
      slug: formData.slug || null,
      is_featured: formData.is_featured,
      is_available: formData.is_available,
      sort_order: formData.sort_order,
      images: formData.images.map((img, idx) => ({
        id: img.id,
        url: img.url,
        alt: img.alt ?? null,
        sort_order: idx,
        is_primary: img.is_primary,
      })),
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля формы')
      return
    }

    setSubmitting(true)
    try {
      const { images, ...productPayload } = parsed.data

      let productId = editingId
      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { data: created, error } = await supabase
          .from('products')
          .insert(productPayload)
          .select('id')
          .single()
        if (error) throw error
        productId = created.id
      }

      if (productId != null) {
        await syncImages(productId, images)
      }

      toast.success(editingId ? 'Товар обновлён' : 'Товар создан')
      setShowModal(false)
      await revalidateSiteCache('/')
      await revalidateSiteCache('/catalog')
      loadData()
    } catch (error) {
      console.error(error)
      toast.error('Ошибка сохранения')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить товар?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      toast.error('Ошибка удаления')
      return
    }
    toast.success('Товар удалён')
    await revalidateSiteCache('/')
    await revalidateSiteCache('/catalog')
    loadData()
  }

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.badge ?? '').toLowerCase().includes(q),
    )
  }, [products, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Товары</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Управление ассортиментом товаров</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/categories"
            className="flex-1 sm:flex-none text-center px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Категории
          </Link>
          <button
            type="button"
            onClick={openNew}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Добавить
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по названию, описанию, бейджу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const primaryImage =
            product.product_images?.find((img) => img.is_primary)?.url ||
            product.product_images?.[0]?.url ||
            product.image_url ||
            ''
          return (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group"
            >
              <div className="relative h-48 bg-gray-100">
                {primaryImage && (
                  <Image
                    src={primaryImage}
                    alt={product.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover"
                  />
                )}
                {product.badge && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs font-bold rounded">
                    {product.badge}
                  </span>
                )}
                {!product.is_available && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">Нет в наличии</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-900">
                  {product.title}
                </h3>
                <p className="text-primary font-bold mt-1">{formatPrice(product)}</p>
                {product.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">Товары не найдены</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6">
                {editingId ? 'Редактировать товар' : 'Новый товар'}
              </h2>

              <form id="product-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Цена (число) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.price_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, price_amount: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Используется для сортировки и структурированных данных
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Валюта
                    </label>
                    <input
                      type="text"
                      value={formData.price_currency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_currency: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Подпись цены на сайте
                  </label>
                  <input
                    type="text"
                    value={formData.price_display}
                    onChange={(e) =>
                      setFormData({ ...formData, price_display: e.target.value })
                    }
                    placeholder="от 2 000 ₽"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Если заполнено — используется вместо числовой цены (например, «от 2 000 ₽»)
                  </p>
                </div>

                <ProductImagesEditor
                  value={formData.images}
                  onChange={(images) => setFormData({ ...formData, images })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Бейдж
                    </label>
                    <input
                      type="text"
                      value={formData.badge}
                      onChange={(e) =>
                        setFormData({ ...formData, badge: e.target.value })
                      }
                      placeholder="Хит, Новинка..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Категория
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({ ...formData, category_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="">Без категории</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug (URL)
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      placeholder="nezhnost-utra"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Порядок сортировки
                    </label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) =>
                        setFormData({ ...formData, is_featured: e.target.checked })
                      }
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">
                      В избранное (попадает в карусель на главной)
                    </span>
                  </label>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) =>
                        setFormData({ ...formData, is_available: e.target.checked })
                      }
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">В наличии</span>
                  </label>
                </div>
              </form>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Сохранение…' : editingId ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
