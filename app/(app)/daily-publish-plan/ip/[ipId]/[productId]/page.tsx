'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

interface AIVideo {
  id: string
  url: string
  thumbnail: string | null
  createdAt: string
  sceneId: string | null
  hasClip: boolean
}

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

interface ProductImage {
  id: string
  url: string
  isMain: boolean
}

interface IpDetailData {
  productId: string
  ipId: string
  ipNickname: string
  productName: string
  productImages: ProductImage[]
  selectedVideos: string[]
  videos: AIVideo[]
  clips: Clip[]
  scenes: { id: string; name: string; thumbnail: string | null }[]
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
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [adding, setAdding] = useState(false)

  // Video player state
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Mark unqualified dialog state
  const [unqualifiedDialogOpen, setUnqualifiedDialogOpen] = useState(false)
  const [selectedClipForUnqualified, setSelectedClipForUnqualified] = useState<Clip | null>(null)
  const [markingUnqualified, setMarkingUnqualified] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
          setSelectedClipIds(new Set(result.selectedVideos || []))
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

  // Clipping state
  const [clipping, setClipping] = useState(false)

  // Clipping: call prepare-clips then clip
  const handleClip = async () => {
    if (selectedClipIds.size === 0) {
      alert('请先选择要剪辑的视频')
      return
    }
    setClipping(true)
    try {
      // Get videoIds from selected clips
      const videoIds = data?.clips
        .filter(c => selectedClipIds.has(c.videoPushId))
        .flatMap(c => c.videoIds) || []

      if (videoIds.length === 0) {
        alert('无法获取视频 ID')
        return
      }

      // Step 1: prepare-clips creates pending VideoPush records
      const prepareRes = await fetch('/api/video-push/prepare-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ipId,
          sceneId: '',
          videoIds,
        }),
      })
      if (!prepareRes.ok) throw new Error('prepare-clips failed')

      // Step 2: trigger clip async
      const clipRes = await fetch('/api/video-push/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ipId,
          sceneId: '',
          videoIds,
        }),
      })
      if (!clipRes.ok) throw new Error('clip failed')

      setSuccessMessage('剪辑任务已启动')
      setTimeout(() => setSuccessMessage(null), 3000)
      // Refresh data
      const refreshRes = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
      if (refreshRes.ok) {
        const result = await refreshRes.json()
        setData(result)
      }
    } catch (err) {
      console.error(err)
      alert('剪辑启动失败，请重试')
    } finally {
      setClipping(false)
    }
  }

  // Re-clip: trigger clip directly without prepare (uses videoIds from first clip)
  const handleReclip = async () => {
    if (!data || data.clips.length === 0) {
      alert('没有可重新剪辑的视频')
      return
    }
    // Use videoIds from the first clip
    const videoIds = data.clips[0]?.videoIds
    if (!videoIds || videoIds.length === 0) {
      alert('无法获取原始视频 ID')
      return
    }
    setClipping(true)
    try {
      const clipRes = await fetch('/api/video-push/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ipId,
          sceneId: '',
          videoIds,
        }),
      })
      if (!clipRes.ok) throw new Error('clip failed')

      setSuccessMessage('重新剪辑任务已启动')
      setTimeout(() => setSuccessMessage(null), 3000)
      const refreshRes = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
      if (refreshRes.ok) {
        const result = await refreshRes.json()
        setData(result)
      }
    } catch (err) {
      console.error(err)
      alert('重新剪辑失败，请重试')
    } finally {
      setClipping(false)
    }
  }

  // New: go to video wizard with IP pre-selected
  const handleNew = () => {
    router.push(`/products/${productId}/video-wizard?ipId=${ipId}`)
  }

  // Toggle clip selection for publish
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

  // Select all / deselect all
  const selectAllClips = () => {
    if (!data) return
    const allIds = data.clips.filter(c => c.status !== 'published').map(c => c.videoPushId)
    setSelectedClipIds(new Set(allIds))
  }

  const deselectAllClips = () => {
    setSelectedClipIds(new Set())
  }

  // Confirm publish
  const handleConfirmPublish = async () => {
    if (selectedClipIds.size === 0) {
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
          videoIds: Array.from(selectedClipIds)
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

  // Add product
  const handleConfirmAddProductAndJump = async () => {
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
          date: today,
        }),
      })
      if (res.ok) {
        setAddProductDialogOpen(false)
        router.push(`/products/${selectedProductId}/video-wizard?ipId=${ipId}`)
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

  // Open mark unqualified dialog
  const handleOpenUnqualifiedDialog = (clip: Clip) => {
    setSelectedClipForUnqualified(clip)
    setUnqualifiedDialogOpen(true)
  }

  // Mark clip as unqualified
  const markClipAsUnqualified = async () => {
    if (!selectedClipForUnqualified) return
    setMarkingUnqualified(true)
    try {
      const res = await fetch('/api/video-push/mark-unqualified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ipId,
          videoPushIds: [selectedClipForUnqualified.videoPushId],
          qualified: false
        })
      })
      if (res.ok) {
        setUnqualifiedDialogOpen(false)
        setSuccessMessage('已标记为不合格')
        setTimeout(() => setSuccessMessage(null), 2000)
        const refreshRes = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
        if (refreshRes.ok) {
          const result = await refreshRes.json()
          setData(result)
        }
      } else {
        throw new Error('Failed to mark unqualified')
      }
    } catch (err) {
      console.error(err)
      alert('标记失败，请重试')
    } finally {
      setMarkingUnqualified(false)
    }
  }

  // Play video
  const handlePlayVideo = (clip: Clip) => {
    setPlayingVideo({ url: clip.url, title: `视频 ${clip.videoPushId.slice(0, 8)}` })
  }

  // Publish single clip
  const handlePublishClip = async (clip: Clip) => {
    setSelectedClipIds(new Set([clip.videoPushId]))
    setConfirming(true)
    try {
      const res = await fetch('/api/daily-publish-plan/confirm-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ipId,
          videoIds: [clip.videoPushId]
        })
      })
      if (res.ok) {
        setSuccessMessage('发布成功')
        setTimeout(() => setSuccessMessage(null), 2000)
        const refreshRes = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
        if (refreshRes.ok) {
          const result = await refreshRes.json()
          setData(result)
        }
      } else {
        throw new Error('Failed to confirm')
      }
    } catch (err) {
      console.error(err)
      alert('发布失败，请重试')
    } finally {
      setConfirming(false)
    }
  }

  // Delete selected (mark as unqualified)
  const handleDeleteSelected = async () => {
    if (selectedClipIds.size === 0) {
      alert('请先选择要删除的视频')
      return
    }
    setMarkingUnqualified(true)
    try {
      const res = await fetch('/api/video-push/mark-unqualified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ipId,
          videoPushIds: Array.from(selectedClipIds),
          qualified: false
        })
      })
      if (res.ok) {
        setSuccessMessage(`已删除 ${selectedClipIds.size} 个视频`)
        setTimeout(() => setSuccessMessage(null), 2000)
        setSelectedClipIds(new Set())
        const refreshRes = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
        if (refreshRes.ok) {
          const result = await refreshRes.json()
          setData(result)
        }
      } else {
        throw new Error('Failed to mark unqualified')
      }
    } catch (err) {
      console.error(err)
      alert('删除失败，请重试')
    } finally {
      setMarkingUnqualified(false)
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

  // Check if any selected clips are already completed/published (should not re-clip those)
  const selectedCount = selectedClipIds.size
  const selectedClipsForClip = data?.clips.filter(c => selectedClipIds.has(c.videoPushId)) || []
  const hasCompletedOrPublished = selectedClipsForClip.some(c => c.status === 'ready' || c.status === 'published')
  const canClip = selectedCount > 0 && !hasCompletedOrPublished
  const totalCount = data.clips.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-4xl mx-auto px-6 py-8">
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
                {data.ipNickname || data.ipId.slice(0, 8)} 发布计划
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm">
              编辑
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0 || markingUnqualified}
              className="px-4 py-2 rounded-lg border border-red-200 bg-white text-sm text-red-500 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm disabled:opacity-50"
            >
              删除选中 ({selectedCount})
            </button>
          </div>
        </div>

        {/* Product Info with Images */}
        <div className="mb-6">
          <div className="rounded-xl border border-oat bg-white p-5 shadow-clay">
            <div className="text-sm text-warm-silver mb-3">产品</div>
            <div className="flex items-start gap-6">
              {/* Product Images - Larger display */}
              {data.productImages.length > 0 && (
                <div className="flex-shrink-0">
                  <div className="grid grid-cols-3 gap-2">
                    {data.productImages.slice(0, 3).map((img, idx) => (
                      <div
                        key={img.id}
                        className={cn(
                          'w-24 h-24 rounded-lg overflow-hidden bg-matcha-100',
                          idx === 0 && 'row-span-2 w-28 h-52'
                        )}
                      >
                        <img
                          src={getImageUrl(img.url)}
                          alt={`产品图 ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-warm-charcoal mb-1">{data.productName}</div>
                <div className="text-xs text-warm-silver">
                  共 {data.productImages.length} 张图片
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Videos Section */}
        {data.videos.length > 0 && (
          <div className="mb-6">
            <div className="rounded-xl border border-oat bg-white shadow-clay overflow-hidden">
              <div className="px-5 py-4 border-b border-oat flex items-center justify-between">
                <h2 className="text-sm font-semibold text-warm-charcoal">AI 视频 ({data.videos.length})</h2>
                <span className="text-xs text-warm-silver">
                  {data.videos.filter(v => v.hasClip).length} 个已剪辑
                </span>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {data.videos.map(video => (
                    <div
                      key={video.id}
                      className={cn(
                        'flex-shrink-0 w-28 rounded-lg overflow-hidden bg-matcha-100 relative',
                        video.hasClip && 'opacity-60'
                      )}
                    >
                      {video.thumbnail ? (
                        <img
                          src={getImageUrl(video.thumbnail)}
                          alt="AI视频"
                          className="w-full h-20 object-cover"
                        />
                      ) : (
                        <div className="w-full h-20 flex items-center justify-center">
                          <svg className="w-8 h-8 text-matcha-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {video.hasClip && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-violet-500 text-white text-[10px] rounded">
                          已剪辑
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clips Section - Row display */}
        <div className="mb-6">
          <div className="rounded-xl border border-oat bg-white shadow-clay overflow-hidden">
            <div className="px-5 py-4 border-b border-oat flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-warm-charcoal">剪辑成片 ({totalCount})</h2>
                {selectedCount > 0 && (
                  <span className="text-xs text-violet-600 font-medium">
                    已选 {selectedCount} 个
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllClips}
                  className="text-xs text-warm-silver hover:text-violet-600 transition-colors"
                >
                  全选
                </button>
                <span className="text-warm-silver">|</span>
                <button
                  onClick={deselectAllClips}
                  className="text-xs text-warm-silver hover:text-violet-600 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
            <div className="divide-y divide-oat/50">
              {data.clips.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-warm-silver text-sm">暂无剪辑成片</p>
                </div>
              ) : (
                data.clips.map(clip => {
                  const isSelected = selectedClipIds.has(clip.videoPushId)
                  return (
                    <div
                      key={clip.videoPushId}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-violet-50/30 transition-colors"
                    >
                      {/* Selection checkbox */}
                      <button
                        onClick={() => toggleClipSelection(clip.videoPushId)}
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

                      {/* Thumbnail with play overlay */}
                      <div
                        className="w-24 h-16 rounded-lg bg-matcha-100 overflow-hidden flex-shrink-0 relative cursor-pointer group"
                        onClick={() => clip.url && handlePlayVideo(clip)}
                      >
                        {clip.thumbnail ? (
                          <>
                            <img
                              src={getImageUrl(clip.thumbnail)}
                              alt="thumbnail"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-matcha-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Video info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono text-warm-charcoal truncate">{clip.videoPushId.slice(0, 16)}...</div>
                        <div className="text-xs text-warm-silver mt-0.5">
                          {new Date(clip.createdAt).toLocaleDateString('zh-CN')} · {clip.videoIds.length} 个源视频
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 rounded',
                        clip.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                        clip.status === 'ready' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-warm-silver'
                      )}>
                        {clip.status === 'published' ? '已发布' : clip.status === 'ready' ? '待发布' : '剪辑中'}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {clip.status !== 'published' && clip.url && (
                          <button
                            onClick={() => handlePlayVideo(clip)}
                            className="px-3 py-1.5 rounded-lg border border-oat text-xs text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all"
                          >
                            查看
                          </button>
                        )}
                        {clip.status === 'ready' && (
                          <button
                            onClick={() => handlePublishClip(clip)}
                            disabled={confirming}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-xs text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                          >
                            发布
                          </button>
                        )}
                        {!clip.isQualified && (
                          <button
                            onClick={() => handleOpenUnqualifiedDialog(clip)}
                            className="px-2 py-1 rounded border border-red-200 text-xs text-red-500 hover:bg-red-50 transition-colors"
                            title="标记不合格"
                          >
                            不合格
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleClip}
              disabled={clipping || !canClip}
              className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm disabled:opacity-50"
            >
              {clipping ? '剪辑中...' : (hasCompletedOrPublished ? '包含已剪辑视频' : '剪辑选中')}
            </button>
            <button
              onClick={handleReclip}
              disabled={clipping || data.clips.length === 0}
              className="px-4 py-2 rounded-lg border border-violet-200 bg-violet-50 text-sm text-violet-600 hover:bg-violet-100 hover:border-violet-400 transition-all shadow-sm disabled:opacity-50"
            >
              重新剪辑
            </button>
            <button
              onClick={handleNew}
              className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
            >
              新增
            </button>
          </div>
        </div>

        {/* Confirm Button */}
        {selectedCount > 0 && (
          <button
            onClick={handleConfirmPublish}
            disabled={confirming}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-xl hover:scale-[1.01]"
          >
            {confirming ? '确认中...' : `确认发布选中的 ${selectedCount} 个视频`}
          </button>
        )}

        {/* Video Player Modal */}
        <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{playingVideo?.title}</DialogTitle>
            </DialogHeader>
            <div className="relative rounded-lg overflow-hidden bg-black">
              {playingVideo?.url && (
                <video
                  ref={videoRef}
                  src={playingVideo.url}
                  controls
                  autoPlay
                  className="w-full max-h-[60vh] mx-auto"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Product Dialog */}
        <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>为 {data.ipNickname || data.ipId.slice(0, 8)} 添加商品</DialogTitle>
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
                onClick={handleConfirmAddProductAndJump}
                disabled={adding}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {adding ? '添加中...' : '确认添加并跳转生图'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark Unqualified Confirmation Dialog */}
        <Dialog open={unqualifiedDialogOpen} onOpenChange={setUnqualifiedDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>确认标记</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-warm-charcoal">
                确定将视频 <span className="font-mono font-medium">{selectedClipForUnqualified?.videoPushId.slice(0, 8)}...</span> 标记为不合格？
              </p>
            </div>
            <DialogFooter>
              <button
                onClick={() => setUnqualifiedDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-gray-50 transition-all"
                disabled={markingUnqualified}
              >
                取消
              </button>
              <button
                onClick={markClipAsUnqualified}
                disabled={markingUnqualified}
                className="px-4 py-2 rounded-lg bg-red-500 text-sm text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {markingUnqualified ? '标记中...' : '确认不合格'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-matcha-600 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in">
            {successMessage}
          </div>
        )}
      </div>
    </div>
  )
}