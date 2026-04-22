'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProductForm } from '@/components/product/ProductForm'

interface ImageItem {
  url: string
  isMain: boolean
  order: number
}

interface ProductData {
  id: string
  name: string
  targetAudience: string
  productDetails: string
  displayActions: string
  tags: string | null
  images: ImageItem[]
}

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products/${params.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('产品不存在')
          } else {
            setError('加载失败')
          }
          return
        }
        const data = await response.json()
        setProduct(data)
      } catch (err) {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDelay: '0.5s' }} />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-white/60">{error || '产品不存在'}</p>
        <button
          onClick={() => router.push('/products')}
          className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          返回产品库
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-slate-950/80 to-fuchsia-950/60" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Back link */}
        <button
          onClick={() => router.push(`/products/${params.id}`)}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">返回产品详情</span>
        </button>

        {/* Form Card */}
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: 'rgba(30,30,40,0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Top gradient border */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          {/* Glow effect */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">编辑产品</h1>
                <p className="text-white/40 text-sm">修改产品信息</p>
              </div>
            </div>

            <ProductForm
              initialData={{
                id: product.id,
                name: product.name,
                targetAudience: product.targetAudience,
                productDetails: product.productDetails || '',
                displayActions: product.displayActions || '',
                tags: product.tags ? JSON.parse(product.tags) : [],
                images: product.images || [],
              }}
              isEditing
            />
          </div>
        </div>
      </div>
    </div>
  )
}
