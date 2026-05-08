'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface ProductInfo {
  productId: string
  productName: string
  productImage: string
  selectedVideoIds: string[]
  videoCount: number
  status: string
  isPublished: boolean
  isQualified: boolean
}

interface IpProductsData {
  ipId: string
  ipNickname: string
  products: ProductInfo[]
}

export default function IpProductsPage() {
  const params = useParams()
  const router = useRouter()
  const ipId = params.ipId as string

  const [data, setData] = useState<IpProductsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!ipId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/daily-publish-plan/ip-products?ipId=${ipId}`)
        if (res.ok) {
          const result = await res.json()
          setData(result)
        } else {
          throw new Error('Failed to fetch')
        }
      } catch (err) {
        console.error(err)
        setError('加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [ipId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">{error || '数据加载失败'}</p>
      </div>
    )
  }

  const totalVideos = data.products.reduce((sum, p) => sum + p.videoCount, 0)
  const publishedCount = data.products.filter(p => p.isPublished).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/daily-publish-plan"
              className="w-9 h-9 rounded-lg border border-oat bg-white flex items-center justify-center text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-warm-charcoal tracking-tight">
                {data.ipNickname || data.ipId.slice(0, 8)}
              </h1>
              <p className="text-warm-silver text-sm">虚拟IP发布管理</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-oat bg-white p-4 shadow-sm">
            <div className="text-xs text-warm-silver uppercase tracking-wider mb-1">商品数</div>
            <div className="text-2xl font-bold text-warm-charcoal">{data.products.length}</div>
          </div>
          <div className="rounded-xl border border-oat bg-white p-4 shadow-sm">
            <div className="text-xs text-warm-silver uppercase tracking-wider mb-1">已选视频</div>
            <div className="text-2xl font-bold text-violet-600">{totalVideos}</div>
          </div>
          <div className="rounded-xl border border-oat bg-white p-4 shadow-sm">
            <div className="text-xs text-warm-silver uppercase tracking-wider mb-1">已发布</div>
            <div className="text-2xl font-bold text-emerald-600">{publishedCount}</div>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-4">
          {data.products.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-oat bg-white">
              <p className="text-warm-silver text-sm">暂无分配的 商品</p>
            </div>
          ) : (
            data.products.map((product, index) => (
              <div
                key={product.productId}
                onClick={() => setSelectedProductId(product.productId === selectedProductId ? null : product.productId)}
                className={cn(
                  'relative rounded-2xl border bg-white shadow-clay overflow-hidden cursor-pointer transition-all',
                  selectedProductId === product.productId
                    ? 'border-violet-400 ring-2 ring-violet-200'
                    : 'border-oat hover:border-violet-300'
                )}
              >
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Product Image */}
                    <img
                      src={getImageUrl(product.productImage)}
                      alt={product.productName}
                      className="w-14 h-14 rounded-xl object-cover shadow-md"
                    />

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-warm-charcoal truncate">
                        {product.productName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-warm-silver">
                          {product.videoCount} 个视频待发布
                        </span>
                        {product.isPublished && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-medium">
                            已发布
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg
                      className={cn(
                        'w-5 h-5 text-warm-silver transition-transform',
                        selectedProductId === product.productId && 'rotate-90'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Expanded Video Details */}
                  {selectedProductId === product.productId && (
                    <div className="mt-4 pt-4 border-t border-oat">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-warm-silver">已选视频 ID</span>
                        <span className="text-sm font-medium text-violet-600">
                          {product.selectedVideoIds.length} 个
                        </span>
                      </div>
                      {product.selectedVideoIds.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {product.selectedVideoIds.slice(0, 6).map(vid => (
                            <span
                              key={vid}
                              className="px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-mono"
                            >
                              {vid.slice(0, 8)}...
                            </span>
                          ))}
                          {product.selectedVideoIds.length > 6 && (
                            <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs">
                              +{product.selectedVideoIds.length - 6} 更多
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-warm-silver">暂无选中的视频</p>
                      )}

                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => router.push(`/daily-publish-plan/ip/${ipId}/${product.productId}`)}
                          className="flex-1 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all"
                        >
                          选择视频
                        </button>
                        <button className="flex-1 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all">
                          编辑
                        </button>
                        <button className="flex-1 py-2 rounded-lg border border-red-200 bg-white text-sm text-red-500 hover:bg-red-50 transition-all">
                          移除
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Index badge */}
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white border-2 border-oat flex items-center justify-center">
                  <span className="text-[10px] font-bold text-warm-silver">{(index + 1).toString().padStart(2, '0')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
