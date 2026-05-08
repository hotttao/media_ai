'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn, getImageUrl } from '@/foundation/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Clip {
  id: string
  videoPushId: string
  sourceVideoId: string
  url: string
  thumbnail: string | null
  createdAt: string
  status: 'pending' | 'ready' | 'published'
  isQualified: boolean
  isPublished: boolean
  videoIds: string[]
}

interface ProductDetailData {
  productId: string
  ipId: string
  ipNickname: string
  productName: string
  selectedVideos: string[]
  videos: { id: string; url: string; thumbnail: string | null; createdAt: string }[]
  clips: Clip[]
}

interface IpProductsData {
  ipId: string
  ipNickname: string
  products: {
    productId: string
    productName: string
    productImage: string
    videoCount: number
    hasPublishedVideos: boolean
  }[]
}

interface SearchProductResult {
  productId: string
  name: string
  image: string
  publishCount: number
  hasGoodData: boolean
  isInDailyPlan: boolean
}

type FilterTab = 'all' | 'published' | 'library'

export default function IpProductsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const ipId = params.ipId as string

  const productIdFromQuery = searchParams.get('productId')

  const [productsData, setProductsData] = useState<IpProductsData | null>(null)
  const [detailData, setDetailData] = useState<ProductDetailData | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(productIdFromQuery)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Source video selection for clipping
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set())
  const [clipping, setClipping] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Select clips mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set())

  // Add product dialog
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [searchResults, setSearchResults] = useState<SearchProductResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string | null>(null)
  const [addingProduct, setAddingProduct] = useState(false)

  // Fetch products list for this IP
  useEffect(() => {
    const fetchProducts = async () => {
      if (!ipId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/daily-publish-plan/ip-products?ipId=${ipId}`)
        if (res.ok) {
          const result = await res.json()
          setProductsData(result)
          if (!selectedProductId && result.products?.length > 0) {
            setSelectedProductId(result.products[0].productId)
          }
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
    fetchProducts()
  }, [ipId])

  // Fetch video detail when a product is selected
  const fetchVideoDetail = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/daily-publish-plan/ip-detail?productId=${pid}&ipId=${ipId}`)
      if (res.ok) {
        const result = await res.json()
        setDetailData(result)
        setSelectedSourceIds(new Set())
        setSelectedClipIds(new Set(result.selectedVideos || []))
      }
    } catch (err) {
      console.error(err)
    }
  }, [ipId])

  useEffect(() => {
    if (selectedProductId) {
      fetchVideoDetail(selectedProductId)
    }
  }, [selectedProductId, fetchVideoDetail])

  // Search products for IP
  const searchProducts = useCallback(async (query: string, filter: FilterTab) => {
    setSearching(true)
    try {
      const res = await fetch(
        `/api/products/search-for-ip?ipId=${ipId}&filter=${filter}&search=${encodeURIComponent(query)}`
      )
      if (res.ok) {
        const results = await res.json()
        setSearchResults(results.products || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }, [ipId])

  // Open add product dialog
  const handleOpenAddProductDialog = () => {
    setAddProductDialogOpen(true)
    setSearchQuery('')
    setActiveFilter('all')
    setSelectedProductToAdd(null)
    searchProducts('', 'all')
  }

  // Search when filter or query changes
  useEffect(() => {
    if (addProductDialogOpen) {
      searchProducts(searchQuery, activeFilter)
    }
  }, [addProductDialogOpen, searchQuery, activeFilter, searchProducts])

  // Toggle source video selection
  const toggleSourceSelection = (videoId: string) => {
    setSelectedSourceIds(prev => {
      const next = new Set(prev)
      if (next.has(videoId)) {
        next.delete(videoId)
      } else {
        next.add(videoId)
      }
      return next
    })
  }

  // Toggle clip selection
  const toggleClipSelection = (clipId: string) => {
    setSelectedClipIds(prev => {
      const next = new Set(prev)
      if (next.has(clipId)) {
        next.delete(clipId)
      } else {
        next.add(clipId)
      }
      return next
    })
  }

  // Handle clip - call prepare-clips then clip API
  const handleClip = async () => {
    if (selectedSourceIds.size === 0) {
      alert('请先选择要剪辑的视频')
      return
    }
    if (!selectedProductId) return

    setClipping(true)
    try {
      const prepareRes = await fetch('/api/video-push/prepare-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          ipId,
          sceneId: '',
          videoIds: Array.from(selectedSourceIds),
        }),
      })

      if (!prepareRes.ok) {
        throw new Error('Prepare clips failed')
      }

      const prepareData = await prepareRes.json()

      if (prepareData.pendingCount > 0) {
        await fetch('/api/video-push/clip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProductId,
            ipId,
            sceneId: '',
            videoIds: Array.from(selectedSourceIds),
          }),
        })
      }

      setSuccessMessage(`剪辑任务已启动，${prepareData.createdCount} 个片段处理中`)
      setTimeout(() => setSuccessMessage(null), 3000)
      setSelectedSourceIds(new Set())
      fetchVideoDetail(selectedProductId)
    } catch (err) {
      console.error(err)
      alert('剪辑启动失败')
    } finally {
      setClipping(false)
    }
  }

  // Handle confirm add product
  const handleConfirmAddProduct = async () => {
    if (!selectedProductToAdd) return
    setAddingProduct(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/daily-publish-plan/assign-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductToAdd,
          ipId,
          date: today,
        }),
      })
      if (res.ok) {
        setAddProductDialogOpen(false)
        // Navigate to video wizard for the added product with IP pre-selected
        router.push(`/products/${selectedProductToAdd}/video-wizard?ipId=${ipId}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAddingProduct(false)
    }
  }

  // Handle confirm publish
  const handleConfirmPublish = async () => {
    if (!detailData || selectedClipIds.size === 0) {
      alert('请选择要发布的视频')
      return
    }
    if (!selectedProductId) return

    setConfirming(true)
    try {
      const res = await fetch('/api/daily-publish-plan/confirm-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          ipId,
          videoIds: Array.from(selectedClipIds),
        }),
      })
      if (res.ok) {
        setSuccessMessage('发布计划已确认')
        setTimeout(() => setSuccessMessage(null), 2000)
        setSelectMode(false)
        fetchVideoDetail(selectedProductId)
      } else {
        throw new Error('Failed to confirm')
      }
    } catch (err) {
      console.error(err)
      alert('确认失败')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !productsData) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">{error || '数据加载失败'}</p>
      </div>
    )
  }

  const selectedProduct = productsData.products.find(p => p.productId === selectedProductId)
  const totalClips = detailData?.clips?.length || 0
  const readyClips = detailData?.clips?.filter(c => c.status === 'ready').length || 0
  const publishedClips = detailData?.clips?.filter(c => c.status === 'published').length || 0

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
                {productsData.ipNickname || ipId.slice(0, 8)}
              </h1>
              <p className="text-warm-silver text-sm">虚拟IP发布管理</p>
            </div>
          </div>
        </div>

        {/* Product Selector Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {productsData.products.map(product => (
            <button
              key={product.productId}
              onClick={() => setSelectedProductId(product.productId)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shadow-sm flex items-center gap-2',
                selectedProductId === product.productId
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg'
                  : 'bg-white text-warm-silver hover:bg-violet-50 border border-oat'
              )}
            >
              <img
                src={getImageUrl(product.productImage)}
                alt={product.productName}
                className="w-5 h-5 rounded object-cover"
              />
              <span className="truncate max-w-[120px]">{product.productName}</span>
              {product.hasPublishedVideos && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        {selectedProduct && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-oat bg-white p-4 shadow-sm">
              <div className="text-xs text-warm-silver uppercase tracking-wider mb-1">AI视频</div>
              <div className="text-2xl font-bold text-warm-charcoal">{detailData?.videos?.length || 0}</div>
            </div>
            <div className="rounded-xl border border-oat bg-white p-4 shadow-sm">
              <div className="text-xs text-warm-silver uppercase tracking-wider mb-1">待发布</div>
              <div className="text-2xl font-bold text-amber-600">{readyClips}</div>
            </div>
            <div className="rounded-xl border border-oat bg-white p-4 shadow-sm">
              <div className="text-xs text-warm-silver uppercase tracking-wider mb-1">已发布</div>
              <div className="text-2xl font-bold text-emerald-600">{publishedClips}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            onClick={handleClip}
            disabled={selectedSourceIds.size === 0 || clipping}
            className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm disabled:opacity-50"
          >
            {clipping ? '剪辑中...' : '剪辑'}
          </button>
          <button
            onClick={() => {
              if (!selectedProductId) return
              router.push(`/products/${selectedProductId}/video-wizard?ipId=${ipId}`)
            }}
            className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
          >
            新增
          </button>
          <button
            onClick={() => setSelectMode(!selectMode)}
            className={cn(
              'px-4 py-2 rounded-lg border text-sm transition-all shadow-sm',
              selectMode
                ? 'border-violet-400 bg-violet-50 text-violet-600'
                : 'border-oat bg-white text-warm-silver hover:bg-matcha-50 hover:border-matcha-600'
            )}
          >
            {selectMode ? '取消选择' : '选择发布视频'}
          </button>
          <button
            onClick={handleOpenAddProductDialog}
            className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
          >
            添加商品
          </button>
        </div>

        {/* Source Video List */}
        <div className="rounded-2xl border border-oat bg-white shadow-clay overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-oat flex items-center justify-between">
            <h2 className="text-sm font-semibold text-warm-charcoal">AI 生成视频</h2>
            <span className="text-xs text-warm-silver">选择后点击剪辑</span>
          </div>
          <div className="divide-y divide-oat/50">
            {!detailData || detailData.videos.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-warm-silver text-sm">暂无 AI 视频</p>
              </div>
            ) : (
              detailData.videos.map(video => (
                <div
                  key={video.id}
                  onClick={() => toggleSourceSelection(video.id)}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-violet-50/50 transition-colors"
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      selectedSourceIds.has(video.id)
                        ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-transparent'
                        : 'bg-white border-oat'
                    )}
                  >
                    {selectedSourceIds.has(video.id) && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="w-16 h-12 rounded-lg bg-matcha-100 overflow-hidden flex-shrink-0">
                    {video.thumbnail ? (
                      <img src={getImageUrl(video.thumbnail)} alt="thumbnail" className="w-full h-full object-cover" />
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
                </div>
              ))
            )}
          </div>
        </div>

        {/* Clips List */}
        {detailData && detailData.clips.length > 0 && (
          <div className="rounded-2xl border border-oat bg-white shadow-clay overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-oat flex items-center justify-between">
              <h2 className="text-sm font-semibold text-warm-charcoal">剪辑片段</h2>
              <span className="text-xs text-warm-silver">
                {readyClips} 个待发布 / {publishedClips} 个已发布
              </span>
            </div>
            <div className="divide-y divide-oat/50">
              {detailData.clips.map(clip => (
                <div
                  key={clip.videoPushId}
                  onClick={() => selectMode && toggleClipSelection(clip.videoPushId)}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 transition-colors',
                    selectMode ? 'cursor-pointer hover:bg-violet-50/50' : ''
                  )}
                >
                  {selectMode && (
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        selectedClipIds.has(clip.videoPushId)
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-transparent'
                          : 'bg-white border-oat'
                      )}
                    >
                      {selectedClipIds.has(clip.videoPushId) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="w-16 h-12 rounded-lg bg-matcha-100 overflow-hidden flex-shrink-0">
                    {clip.thumbnail ? (
                      <img src={getImageUrl(clip.thumbnail)} alt="thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-matcha-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-warm-charcoal truncate">
                      源: {clip.sourceVideoId.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-warm-silver">
                      {new Date(clip.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    clip.status === 'published' ? 'bg-emerald-100 text-emerald-600' :
                    clip.status === 'ready' ? 'bg-amber-100 text-amber-600' :
                    'bg-gray-100 text-gray-500'
                  )}>
                    {clip.status === 'published' ? '已发布' :
                     clip.status === 'ready' ? '待发布' : '剪辑中'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        {selectMode && (
          <button
            onClick={handleConfirmPublish}
            disabled={selectedClipIds.size === 0 || confirming}
            className={cn(
              'w-full py-3 rounded-xl font-semibold text-white transition-all shadow-lg',
              selectedClipIds.size > 0
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-xl hover:scale-[1.01]'
                : 'bg-warm-silver/50 cursor-not-allowed'
            )}
          >
            {confirming ? '确认中...' : `确认发布计划 (${selectedClipIds.size}个)`}
          </button>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-matcha-600 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in">
            {successMessage}
          </div>
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加商品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-silver"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

            {/* Product List */}
            <div className="max-h-64 overflow-y-auto border border-oat rounded-lg">
              {searching ? (
                <div className="py-8 text-center text-warm-silver text-sm">搜索中...</div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-warm-silver text-sm">暂无商品</div>
              ) : (
                searchResults.map((product) => (
                  <div
                    key={product.productId}
                    onClick={() => setSelectedProductToAdd(product.productId)}
                    className={cn(
                      'px-4 py-3 cursor-pointer border-b border-oat/50 last:border-b-0 transition-colors',
                      selectedProductToAdd === product.productId
                        ? 'bg-violet-50'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          selectedProductToAdd === product.productId
                            ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-transparent'
                            : 'bg-white border-oat'
                        )}
                      >
                        {selectedProductToAdd === product.productId && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-warm-charcoal">{product.name}</div>
                        <div className="text-xs text-warm-silver mt-0.5">
                          {product.isInDailyPlan ? (
                            <span className="text-matcha-600">已加入当日计划</span>
                          ) : product.publishCount > 0 ? (
                            <span>
                              该IP历史发布 {product.publishCount} 次
                              {product.hasGoodData && <span className="text-orange-500 ml-1">数据好 ⭐</span>}
                            </span>
                          ) : (
                            '商品库 - 未发布过'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-xs text-warm-silver">
              说明：已发布商品复用该IP历史数据，新视频效果更好
            </p>
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
              disabled={!selectedProductToAdd || addingProduct}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {addingProduct ? '添加中...' : '确认添加'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
