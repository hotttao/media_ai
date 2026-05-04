'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { cn, getImageUrl } from '@/foundation/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ProductStats {
  productId: string
  productName: string
  productImage: string
  ipId: string
  aiVideoCount: number
  pushableCount: number
  publishedCount: number
  clippableCount: number
  newGeneratableCount: number
}

interface VideoPushItem {
  id: string
  url: string
  thumbnail: string | null
  title: string | null
  isQualified: boolean
  isPublished: boolean
  createdAt: string
  video: {
    id: string
    url: string
    thumbnail: string | null
  } | null
}

export default function DailyPublishPlanPage() {
  const { data: session } = useSession()
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [products, setProducts] = useState<ProductStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clippingProductId, setClippingProductId] = useState<string | null>(null)
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)

  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishingProduct, setPublishingProduct] = useState<ProductStats | null>(null)
  const [publishableVideos, setPublishableVideos] = useState<VideoPushItem[]>([])
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())
  const [loadingPublishable, setLoadingPublishable] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const fetchProducts = async () => {
    if (!selectedDate) return
    setLoading(true)
    try {
      const res = await fetch(`/api/daily-publish-plan/${selectedDate}/products`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      } else {
        throw new Error('Failed to fetch products')
      }
    } catch (err) {
      console.error(err)
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [selectedDate])

  const availableIps = useMemo(() => {
    const ipMap = new Map<string, { id: string }>()
    products.forEach(p => {
      if (p.ipId && !ipMap.has(p.ipId)) {
        ipMap.set(p.ipId, { id: p.ipId })
      }
    })
    return Array.from(ipMap.values())
  }, [products])

  const filteredProducts = useMemo(() => {
    if (!selectedIpId) return products
    return products.filter(p => p.ipId === selectedIpId)
  }, [products, selectedIpId])

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    return filteredProducts.reduce((acc, p) => ({
      totalAi: acc.totalAi + p.aiVideoCount,
      totalPushable: acc.totalPushable + p.pushableCount,
      totalPublished: acc.totalPublished + p.publishedCount,
      totalClippable: acc.totalClippable + p.clippableCount,
      totalNewGeneratable: acc.totalNewGeneratable + p.newGeneratableCount,
    }), { totalAi: 0, totalPushable: 0, totalPublished: 0, totalClippable: 0, totalNewGeneratable: 0 })
  }, [filteredProducts])

  const handleClip = async (productId: string, productName: string) => {
    if (!confirm(`确定对 ${productName} 执行剪辑？将使用随机背景音乐。`)) return
    setClippingProductId(productId)
    try {
      const res = await fetch('/api/video-push/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(`剪辑任务已提交，创建了 ${data.videos?.length || 0} 个视频`)
        fetchProducts()
      } else {
        const err = await res.json()
        alert(`剪辑失败: ${err.error}`)
      }
    } catch (err) {
      console.error(err)
      alert('剪辑失败')
    } finally {
      setClippingProductId(null)
    }
  }

  const openPublishDialog = async (product: ProductStats) => {
    setPublishingProduct(product)
    setPublishDialogOpen(true)
    setLoadingPublishable(true)
    setSelectedVideoIds(new Set())
    try {
      const res = await fetch(`/api/video-push?productId=${product.productId}&ipId=${product.ipId}&qualified=true`)
      if (res.ok) {
        const data = await res.json()
        const unpublished = (data.videos || []).filter((v: VideoPushItem) => v.isQualified && !v.isPublished)
        setPublishableVideos(unpublished)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPublishable(false)
    }
  }

  const handlePublish = async () => {
    if (!publishingProduct || selectedVideoIds.size === 0) return
    setPublishing(true)
    try {
      const promises = Array.from(selectedVideoIds).map(videoId =>
        fetch(`/api/video-push/${videoId}/publish`, { method: 'POST' })
      )
      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.ok).length
      alert(`成功发布 ${successCount} 个视频`)
      if (successCount > 0) {
        fetchProducts()
        setPublishDialogOpen(false)
      }
    } catch (err) {
      console.error(err)
      alert('发布失败')
    } finally {
      setPublishing(false)
    }
  }

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev)
      next.has(videoId) ? next.delete(videoId) : next.add(videoId)
      return next
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === today.toISOString().split('T')[0]) return '今日'
    if (dateStr === tomorrow.toISOString().split('T')[0]) return '明日'
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,180,60,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,180,60,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_40%,transparent_100%)]" />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-amber-500/10 bg-[#0c0c0e]/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">发布计划</h1>
                  <p className="text-xs text-white/40">Daily Publish Command</p>
                </div>
              </div>

              {/* Date Selector */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const d = new Date(selectedDate)
                    d.setDate(d.getDate() - 1)
                    setSelectedDate(d.toISOString().split('T')[0])
                  }}
                  className="w-8 h-8 rounded-lg border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-400 font-medium">{formatDate(selectedDate)}</span>
                </div>
                <button
                  onClick={() => {
                    const d = new Date(selectedDate)
                    d.setDate(d.getDate() + 1)
                    setSelectedDate(d.toISOString().split('T')[0])
                  }}
                  className="w-8 h-8 rounded-lg border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="sr-only"
                  id="date-input"
                />
                <label htmlFor="date-input" className="w-8 h-8 rounded-lg border border-amber-500/20 flex items-center justify-center hover:bg-amber-500/10 transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </label>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {error ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-400">{error}</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 animate-spin" />
                <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" style={{ animationDuration: '0.8s' }} />
              </div>
              <span className="ml-4 text-white/60">加载中...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/5 mb-6">
                <svg className="w-10 h-10 text-amber-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-white/80 mb-2">暂无产品</h2>
              <p className="text-white/40 text-sm">在产品详情页添加产品到当日发布计划</p>
              <Link href="/products" className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm hover:bg-amber-500/20 transition-colors">
                浏览产品
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          ) : (
            <>
              {/* IP Filter Tabs */}
              {availableIps.length > 1 && (
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedIpId(null)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                      !selectedIpId
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                  >
                    全部 · {products.length}
                  </button>
                  {availableIps.map(ip => {
                    const count = products.filter(p => p.ipId === ip.id).length
                    return (
                      <button
                        key={ip.id}
                        onClick={() => setSelectedIpId(ip.id)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                          selectedIpId === ip.id
                            ? 'bg-amber-500 text-black'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        )}
                      >
                        {ip.id.slice(0, 8)}... · {count}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Aggregate Stats Bar */}
              <div className="grid grid-cols-5 gap-3 mb-8">
                <StatCard label="AI视频" value={aggregateStats.totalAi} icon="🎬" color="from-blue-500/20 to-blue-600/5" />
                <StatCard label="已发布" value={aggregateStats.totalPublished} icon="✓" color="from-emerald-500/20 to-emerald-600/5" />
                <StatCard label="待发布" value={aggregateStats.totalPushable} icon="→" color="from-amber-500/20 to-amber-600/5" />
                <StatCard label="可剪辑" value={aggregateStats.totalClippable} icon="✂" color="from-purple-500/20 to-purple-600/5" />
                <StatCard label="可新增" value={aggregateStats.totalNewGeneratable} icon="+" color="from-orange-500/20 to-orange-600/5" />
              </div>

              {/* Product List */}
              <div className="space-y-4">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.productId}
                    product={product}
                    index={index}
                    onClip={handleClip}
                    onPublish={openPublishDialog}
                    onNavigateToProduct={() => {}}
                    clippingProductId={clippingProductId}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="bg-[#1a1a1e] border-amber-500/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              发布视频 - {publishingProduct?.productName}
            </DialogTitle>
          </DialogHeader>

          {loadingPublishable ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          ) : publishableVideos.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              暂无可发布的视频
            </div>
          ) : (
            <>
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-4">
                  {publishableVideos.map(video => (
                    <div
                      key={video.id}
                      onClick={() => toggleVideoSelection(video.id)}
                      className={cn(
                        'relative rounded-lg border-2 cursor-pointer transition-all overflow-hidden',
                        selectedVideoIds.has(video.id)
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-transparent hover:border-white/20'
                      )}
                    >
                      {video.thumbnail || video.video?.thumbnail ? (
                        <img src={getImageUrl(video.thumbnail || video.video?.thumbnail || '')} alt="" className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-white/5 flex items-center justify-center text-white/20">无封面</div>
                      )}
                      {selectedVideoIds.has(video.id) && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-sm text-white/60">已选择 {selectedVideoIds.size} 个视频</span>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPublishDialogOpen(false)} className="border-white/20 text-white/60 hover:bg-white/5">取消</Button>
                  <Button onClick={handlePublish} disabled={selectedVideoIds.size === 0 || publishing} className="bg-amber-500 hover:bg-amber-400 text-black">
                    {publishing ? '发布中...' : `确认发布 (${selectedVideoIds.size})`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className={cn('relative rounded-xl border border-white/5 p-4 overflow-hidden group', `bg-gradient-to-br ${color}`)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

function ProductCard({
  product,
  index,
  onClip,
  onPublish,
  clippingProductId
}: {
  product: ProductStats
  index: number
  onClip: (productId: string, productName: string) => void
  onPublish: (product: ProductStats) => void
  onNavigateToProduct: () => void
  clippingProductId: string | null
}) {
  return (
    <div
      className="relative rounded-2xl border border-white/5 bg-[#12121a] overflow-hidden group animate-[fadeInUp_0.4s_ease-out_forwards]"
      style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="p-6">
        <div className="flex items-start gap-5">
          {/* Product Image */}
          <div className="relative">
            <img
              src={getImageUrl(product.productImage)}
              alt={product.productName}
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-[#0c0c0e] border border-white/10 flex items-center justify-center">
              <span className="text-[10px] font-medium text-white/60">{(index + 1).toString().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium mb-1 truncate">{product.productName}</h3>
            <p className="text-sm text-white/40 font-mono">IP: {product.ipId.slice(0, 12)}...</p>

            {/* Progress Bars */}
            <div className="mt-4 space-y-2">
              <ProgressBar
                label="生成进度"
                current={product.aiVideoCount}
                total={product.aiVideoCount + product.newGeneratableCount}
                color="bg-blue-500"
              />
              <ProgressBar
                label="发布进度"
                current={product.publishedCount}
                total={product.aiVideoCount}
                color="bg-emerald-500"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{product.pushableCount}</div>
              <div className="text-xs text-white/40 mt-1">待发布</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{product.publishedCount}</div>
              <div className="text-xs text-white/40 mt-1">已发布</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{product.clippableCount}</div>
              <div className="text-xs text-white/40 mt-1">可剪辑</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {product.pushableCount > 0 && (
              <button
                onClick={() => onPublish(product)}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
              >
                发布
              </button>
            )}
            <button
              onClick={() => onClip(product.productId, product.productName)}
              disabled={clippingProductId === product.productId || product.clippableCount === 0}
              className="px-4 py-2 rounded-lg bg-white/5 text-white/80 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {clippingProductId === product.productId ? '剪辑中...' : '剪辑'}
            </button>
            <Link
              href={`/products/${product.productId}?tab=generate`}
              className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
            >
              新增
            </Link>
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}

function ProgressBar({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const percentage = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/40 w-20">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-white/60 w-16 text-right">{current}/{total}</span>
    </div>
  )
}