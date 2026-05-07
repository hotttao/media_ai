'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, getImageUrl } from '@/foundation/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Video {
  id: string
  url: string
  thumbnail: string | null
  createdAt: string
}

interface IpDetailData {
  productId: string
  ipId: string
  productName: string
  selectedVideos: string[]
  videos: Video[]
}

interface ProductSearchResult {
  id: string
  name: string
  publishCount: number
  isGood: boolean
  inCurrentPlan: boolean
  source: 'published' | 'library'
}

type FilterTab = 'all' | 'published' | 'library'

export default function IpDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ipId = params.ipId as string
  const productId = params.productId as string

  const [data, setData] = useState<IpDetailData | null>(null)
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [adding, setAdding] = useState(false)

  // Add product dialog state
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!ipId || !productId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
        if (res.ok) {
          const result = await res.json()
          setData(result)
          setSelectedVideoIds(new Set(result.selectedVideos || []))
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
  }, [ipId, productId])

  // Search products for IP
  const searchProducts = useCallback(async (query: string, filter: FilterTab) => {
    setSearching(true)
    try {
      const res = await fetch(
        `/api/products/search-for-ip?ipId=${ipId}&filter=${filter}&search=${encodeURIComponent(query)}`
      )
      if (res.ok) {
        const results = await res.json()
        setSearchResults(results)
      } else {
        console.error('Failed to search products')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }, [ipId])

  // Open dialog and search initially
  const handleOpenAddProductDialog = () => {
    setAddProductDialogOpen(true)
    setSearchQuery('')
    setActiveFilter('all')
    setSelectedProductId(null)
    searchProducts('', 'all')
  }

  // Search when filter or query changes
  useEffect(() => {
    if (addProductDialogOpen) {
      searchProducts(searchQuery, activeFilter)
    }
  }, [addProductDialogOpen, searchQuery, activeFilter, searchProducts])

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev)
      if (next.has(videoId)) {
        next.delete(videoId)
      } else {
        next.add(videoId)
      }
      return next
    })
  }

  const handleConfirmPublish = async () => {
    if (selectedVideoIds.size === 0) {
      alert('请至少选择一个视频')
      return
    }
    setConfirming(true)
    try {
      const res = await fetch('/api/daily-publish-plan/confirm-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ipId,
          videoIds: Array.from(selectedVideoIds)
        })
      })
      if (res.ok) {
        router.push('/daily-publish-plan')
      } else {
        throw new Error('Failed to confirm')
      }
    } catch (err) {
      console.error(err)
      alert('确认失败，请重试')
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmAddProduct = async () => {
    if (!selectedProductId) {
      alert('请选择一个商品')
      return
    }
    setAdding(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/daily-publish-plan/assign-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          ipId,
          date: today
        })
      })
      if (res.ok) {
        setAddProductDialogOpen(false)
        router.refresh()
      } else {
        throw new Error('Failed to add product')
      }
    } catch (err) {
      console.error(err)
      alert('添加失败，请重试')
    } finally {
      setAdding(false)
    }
  }

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

  const selectedCount = selectedVideoIds.size
  const totalCount = data.videos.length

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
                {data.ipId.slice(0, 8)}... 发布计划
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm">
              编辑
            </button>
            <button className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-red-500 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm">
              删除
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="mb-6">
          <div className="rounded-xl border border-oat bg-white p-5 shadow-clay">
            <div className="text-sm text-warm-silver mb-1">产品</div>
            <div className="text-base font-semibold text-warm-charcoal">{data.productName}</div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-warm-silver">
              已选 <span className="font-semibold text-violet-600">{selectedCount}</span>/{totalCount} 个视频
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm">
              剪辑
            </button>
            <button className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm">
              新增
            </button>
            <button className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm">
              选择发布视频
            </button>
            <button
              onClick={handleOpenAddProductDialog}
              className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
            >
              添加商品
            </button>
          </div>
        </div>

        {/* Video List */}
        <div className="rounded-2xl border border-oat bg-white shadow-clay overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-oat">
            <h2 className="text-sm font-semibold text-warm-charcoal">视频列表</h2>
          </div>
          <div className="divide-y divide-oat/50">
            {data.videos.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-warm-silver text-sm">暂无视频</p>
              </div>
            ) : (
              data.videos.map(video => {
                const isSelected = selectedVideoIds.has(video.id)
                return (
                  <div
                    key={video.id}
                    onClick={() => toggleVideoSelection(video.id)}
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-violet-50/50 transition-colors"
                  >
                    <button
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        isSelected
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-transparent'
                          : 'bg-white border-oat hover:border-violet-400'
                      )}
                    >
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div className="w-16 h-12 rounded-lg bg-matcha-100 overflow-hidden flex-shrink-0">
                      {video.thumbnail ? (
                        <img
                          src={getImageUrl(video.thumbnail)}
                          alt="thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-matcha-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-warm-charcoal truncate">{video.id}</div>
                      <div className="text-xs text-warm-silver">
                        {new Date(video.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    {isSelected ? (
                        <span className="text-xs text-violet-600 font-medium">待发布</span>
                      ) : (
                        <span className="text-xs text-warm-silver">未发布</span>
                      )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirmPublish}
          disabled={confirming || selectedCount === 0}
          className={cn(
            'w-full py-3 rounded-xl font-semibold text-white transition-all shadow-lg',
            selectedCount > 0
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-xl hover:scale-[1.01]'
              : 'bg-warm-silver/50 cursor-not-allowed'
          )}
        >
          {confirming ? '确认中...' : '确认发布计划'}
        </button>

        {/* Add Product Dialog */}
        <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>为 {data.ipId.slice(0, 8)}... 添加商品</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Search Input */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-silver"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="搜索商品名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-oat bg-white text-sm text-warm-charcoal placeholder:text-warm-silver/60 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-warm-silver">筛选：</span>
                <div className="flex items-center gap-1">
                  {(['all', 'published', 'library'] as FilterTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm transition-all',
                        activeFilter === tab
                          ? 'bg-violet-500 text-white'
                          : 'bg-white text-warm-silver hover:bg-violet-50 border border-oat'
                      )}
                    >
                      {tab === 'all' ? '全部' : tab === 'published' ? '已发布' : '商品库'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product List */}
              <div className="max-h-64 overflow-y-auto border border-oat rounded-lg">
                {searching ? (
                  <div className="py-8 text-center text-warm-silver text-sm">搜索中...</div>
                ) : searchResults.length === 0 ? (
                  <div className="py-8 text-center text-warm-silver text-sm">暂无商品</div>
                ) : (
                  searchResults.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className={cn(
                        'px-4 py-3 cursor-pointer border-b border-oat/50 last:border-b-0 transition-colors',
                        selectedProductId === product.id
                          ? 'bg-violet-50'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                            selectedProductId === product.id
                              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-transparent'
                              : 'bg-white border-oat'
                          )}
                        >
                          {selectedProductId === product.id && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-warm-charcoal">{product.name}</div>
                          <div className="text-xs text-warm-silver mt-0.5">
                            {product.inCurrentPlan ? (
                              <span className="text-matcha-600">已加入当日计划</span>
                            ) : product.source === 'library' ? (
                              '商品库 - 未发布过'
                            ) : (
                              <span>
                                该IP历史发布 {product.publishCount} 次
                                {product.isGood && <span className="text-orange-500 ml-1">数据好 ⭐</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <button
                onClick={() => setAddProductDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleConfirmAddProduct}
                disabled={adding}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {adding ? '添加中...' : '确认添加'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
