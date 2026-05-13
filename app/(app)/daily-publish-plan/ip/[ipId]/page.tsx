'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { ThumbnailUploader } from '@/components/daily-publish-plan/ThumbnailUploader'
import { VideoUploader } from '@/components/daily-publish-plan/VideoUploader'

interface Clip {
  id: string
  videoPushId: string
  sourceVideoId: string
  url: string
  videoThumbnail: string | null
  thumbnail: string | null
  createdAt: string
  status: 'pending' | 'ready' | 'published' | 'failed'
  isQualified: boolean
  isPublished: boolean
  videoIds: string[]
  musicId?: string
  templateName?: string
  title?: string
  content?: string
  manualClipUrl?: string  // 手动剪辑后上传的视频
}

// Per-row editing state
interface ClipRowState {
  thumbnail: string
  title: string
  content: string
  isQualified: boolean
  isPublished: boolean
  dirty: boolean
  aiFilling?: boolean
  manualClipUrl?: string  // 手动剪辑后上传的视频
}

interface AiFillResult {
  videoPushId: string
  results: { title: string; content: string }[]
  prompt: string
  productName: string
  productImage: string
}

interface ProductDetailData {
  productId: string
  ipId: string
  ipNickname: string
  productName: string
  selectedVideos: string[]
  videos: { id: string; url: string; thumbnail: string | null; createdAt: string; sceneId: string | null }[]
  clips: Clip[]
  scenes: { id: string; name: string; thumbnail: string | null }[]
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
  const dateFromQuery = searchParams.get('date')

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

  // Per-row editing states for clips table
  const [clipStates, setClipStates] = useState<Record<string, ClipRowState>>({})

  // Video player state
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null)

  // AI fill dialog state
  const [aiFillDialog, setAiFillDialog] = useState<AiFillResult | null>(null)

  // AI fill result cache (keyed by productId)
  const [aiFillCache, setAiFillCache] = useState<Record<string, AiFillResult>>({})

  // Scene filter for source videos
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)

  
  // Derive unique scenes with counts from API data (must be before early returns to preserve hook order)
  const availableScenes = useMemo(() => {
    if (!detailData?.scenes) return []
    return detailData.scenes.map(s => ({
      ...s,
      count: detailData.videos.filter(v => v.sceneId === s.id).length,
    }))
  }, [detailData?.scenes, detailData?.videos])

  // Fetch products list for this IP
  useEffect(() => {
    const fetchProducts = async () => {
      if (!ipId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/daily-publish-plan/ip-products?ipId=${ipId}${dateFromQuery ? `&date=${dateFromQuery}` : ''}`)
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
        // Initialize per-row states for clips table
        const states: Record<string, ClipRowState> = {}
        result.clips?.forEach((clip: Clip) => {
          states[clip.videoPushId] = {
            thumbnail: clip.thumbnail || '',
            title: clip.title || '',
            content: clip.content || '',
            isQualified: clip.isQualified,
            isPublished: clip.isPublished,
            dirty: false,
            manualClipUrl: clip.manualClipUrl || '',
          }
        })
        setClipStates(states)
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

  // Update clip row state
  const updateClipState = (videoPushId: string, field: keyof ClipRowState, value: string | boolean) => {
    setClipStates(prev => ({
      ...prev,
      [videoPushId]: {
        ...prev[videoPushId],
        [field]: value,
        dirty: true,
      }
    }))
  }

  // Confirm/save clip changes
  const handleConfirmClips = async () => {
    const dirtyClips = Object.entries(clipStates).filter(([_, state]) => state.dirty)
    if (dirtyClips.length === 0) return

    const updates = dirtyClips.map(([videoPushId, state]) => {
      const originalClip = detailData?.clips.find(c => c.videoPushId === videoPushId)
      // If was published but is now dirty, reset to unpublished
      const wasPublished = originalClip?.isPublished === true
      return {
        videoPushId,
        thumbnail: state.thumbnail,
        title: state.title,
        content: state.content,
        isQualified: state.isQualified,
        isPublished: wasPublished ? false : state.isPublished,
        manualClipUrl: state.manualClipUrl,
      }
    })

    setConfirming(true)
    try {
      const res = await fetch('/api/video-push/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (res.ok) {
        setSuccessMessage(`已保存 ${updates.length} 个视频`)
        setTimeout(() => setSuccessMessage(null), 2000)
        // Refresh data
        if (selectedProductId) {
          fetchVideoDetail(selectedProductId)
        }
      }
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setConfirming(false)
    }
  }

  // Publish single clip
  const handleRowPublish = async (videoPushId: string) => {
    const state = clipStates[videoPushId]
    if (!state) return

    setConfirming(true)
    try {
      const res = await fetch('/api/video-push/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{
            videoPushId,
            thumbnail: state.thumbnail,
            title: state.title,
            content: state.content,
            isQualified: state.isQualified,
            isPublished: true, // 点击发布就设置发布
            manualClipUrl: state.manualClipUrl, // 保存手动剪辑视频
          }]
        }),
      })
      if (res.ok) {
        setSuccessMessage('已发布')
        setTimeout(() => setSuccessMessage(null), 2000)
        if (selectedProductId) {
          fetchVideoDetail(selectedProductId)
        }
      }
    } catch (err) {
      console.error(err)
      alert('发布失败')
    } finally {
      setConfirming(false)
    }
  }

  // Push clip via Feishu
  const handlePushClip = async (videoPushId: string) => {
    const state = clipStates[videoPushId]
    const clip = detailData?.clips.find(c => c.videoPushId === videoPushId)
    if (!state || !clip) return

    // 优先使用手动剪辑的视频，否则使用 AI 生成的视频
    const videoUrl = state.manualClipUrl || clip.url
    if (!videoUrl) {
      alert('请先上传手动剪辑的视频')
      return
    }

    try {
      const res = await fetch('/api/video-push/feishu-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPushId,
          title: state.title || clip.title,
          content: state.content || clip.content,
          thumbnail: state.thumbnail || clip.thumbnail,
          videoUrl,
        }),
      })
      if (res.ok) {
        setSuccessMessage('推送成功')
        setTimeout(() => setSuccessMessage(null), 2000)
      } else {
        const data = await res.json()
        alert(data.error || '推送失败')
      }
    } catch (err) {
      console.error(err)
      alert('推送失败')
    }
  }

  // Delete clip
  const handleDeleteClip = async (videoPushId: string) => {
    if (!confirm('确定删除这条记录吗？')) return
    try {
      const res = await fetch(`/api/video-push/${videoPushId}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccessMessage('已删除')
        setTimeout(() => setSuccessMessage(null), 2000)
        if (selectedProductId) {
          fetchVideoDetail(selectedProductId)
        }
      } else {
        alert('删除失败')
      }
    } catch (err) {
      console.error(err)
      alert('删除失败')
    }
  }

  // AI fill title and content
  const handleAIFill = async (videoPushId: string) => {
    if (!selectedProductId) return

    // Check cache first
    if (aiFillCache[selectedProductId]) {
      setAiFillDialog({ ...aiFillCache[selectedProductId], videoPushId })
      return
    }

    setClipStates(prev => ({
      ...prev,
      [videoPushId]: { ...prev[videoPushId], aiFilling: true }
    }))

    try {
      const res = await fetch(`/api/video-push/ai-fill?productId=${selectedProductId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.results && data.results.length > 0) {
          const result = { videoPushId, results: data.results, prompt: data.prompt, productName: data.productName, productImage: data.productImage }
          setAiFillCache(prev => ({ ...prev, [selectedProductId]: result }))
          setAiFillDialog(result)
        } else {
          alert('AI 生成失败，请重试')
        }
      } else {
        alert('AI 填充失败')
      }
    } catch (err) {
      console.error(err)
      alert('AI 填充失败')
    } finally {
      setClipStates(prev => ({
        ...prev,
        [videoPushId]: { ...prev[videoPushId], aiFilling: false }
      }))
    }
  }

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

  // Handle clip - call prepare-clips then clip API
  const handleClip = async () => {
    if (selectedSourceIds.size === 0) {
      alert('请先选择要剪辑的视频')
      return
    }
    if (!selectedProductId) return

    // Validate: all selected videos must belong to the same scene
    const selectedVideos = detailData?.videos.filter(v => selectedSourceIds.has(v.id)) || []
    const sceneIds = [...new Set(selectedVideos.map(v => v.sceneId).filter(Boolean))] as string[]
    if (sceneIds.length > 1) {
      alert('只能选择同一场景的视频进行剪辑')
      return
    }
    const clipSceneId = sceneIds[0] || ''

    setClipping(true)
    try {
      const prepareRes = await fetch('/api/video-push/prepare-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          ipId,
          sceneId: clipSceneId,
          videoIds: Array.from(selectedSourceIds),
        }),
      })

      if (!prepareRes.ok) {
        throw new Error('Prepare clips failed')
      }

      const prepareData = await prepareRes.json()

      if (prepareData.createdCount > 0) {
        await fetch('/api/video-push/clip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProductId,
            ipId,
            sceneId: clipSceneId,
            videoIds: Array.from(selectedSourceIds),
          }),
        })
      }

      if (prepareData.message === 'Clips already prepared') {
        setSuccessMessage('该视频组合已完成剪辑')
      } else {
        setSuccessMessage(`剪辑任务已启动，${prepareData.createdCount} 个片段处理中`)
      }
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
  const dirtyCount = Object.values(clipStates).filter(s => s.dirty).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Decorative top gradient */}
      <div className="h-64 bg-gradient-to-b from-indigo-50/50 to-transparent absolute inset-x-0 top-0 pointer-events-none" />

      <div className="relative max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Link
              href="/daily-publish-plan"
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {productsData.ipNickname || ipId.slice(0, 8)}
              </h1>
              <p className="text-slate-500 text-sm">虚拟IP发布管理</p>
            </div>
          </div>
          <button
            onClick={() => selectedProductId && fetchVideoDetail(selectedProductId)}
            className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-all"
          >
            刷新所有数据
          </button>
        </div>

        {/* Product Selector */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
          {productsData.products.map(product => (
            <button
              key={product.productId}
              onClick={() => setSelectedProductId(product.productId)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shadow-sm border',
                selectedProductId === product.productId
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-transparent shadow-lg shadow-indigo-500/25'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              )}
            >
              <div className="flex items-center gap-2">
                <img
                  src={getImageUrl(product.productImage)}
                  alt={product.productName}
                  className="w-5 h-5 rounded object-cover"
                />
                <span className="truncate max-w-[100px]">{product.productName}</span>
                {product.hasPublishedVideos && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Stats */}
        {selectedProduct && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">AI视频</div>
              <div className="text-3xl font-bold text-slate-900">{detailData?.videos?.length || 0}</div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">待发布</div>
              <div className="text-3xl font-bold text-amber-500">{readyClips}</div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">已发布</div>
              <div className="text-3xl font-bold text-emerald-500">{publishedClips}</div>
            </div>
          </div>
        )}

        {/* Source Video Grid - 9:16 vertical thumbnails */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden mb-8 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">AI 生成视频</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClip}
                disabled={selectedSourceIds.size === 0 || clipping}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {clipping ? '剪辑中...' : '剪辑'}
              </button>
              <button
                onClick={() => {
                  if (!selectedProductId) return
                  router.push(`/products/${selectedProductId}/video-wizard?ipId=${ipId}`)
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-sm text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                新增
              </button>
            </div>
          </div>

          {/* Scene filter */}
          {availableScenes.length > 0 && (
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-slate-400 whitespace-nowrap">场景：</span>
              <button
                onClick={() => setSelectedSceneId(null)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all',
                  selectedSceneId === null
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                )}
              >
                全部
              </button>
              {availableScenes.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSceneId(s.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5',
                    selectedSceneId === s.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  )}
                >
                  {s.thumbnail && (
                    <img src={getImageUrl(s.thumbnail)} alt="" className="w-4 h-4 rounded object-cover" />
                  )}
                  <span className="truncate max-w-[80px]">{s.name || s.id}</span>
                  <span className="opacity-60">({s.count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Video grid - 9:16 vertical thumbnails */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 p-6">
            {!detailData || detailData.videos.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-slate-400 text-sm">暂无 AI 视频</p>
              </div>
            ) : (
              detailData.videos
                .filter(v => selectedSceneId === null || v.sceneId === selectedSceneId)
                .map(video => (
                  <div
                    key={video.id}
                    className={cn(
                      'relative rounded-xl overflow-hidden cursor-pointer transition-all shadow-sm border-2',
                      selectedSourceIds.has(video.id)
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                        : 'border-transparent hover:border-slate-300'
                    )}
                    style={{ aspectRatio: '9/16' }}
                  >
                    {video.thumbnail ? (
                      <img src={getImageUrl(video.thumbnail)} alt="thumbnail" className="w-full h-full object-cover" />
                    ) : null}
                    {/* Selection checkbox in top-right corner */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSourceSelection(video.id)
                      }}
                      className={cn(
                        'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10',
                        selectedSourceIds.has(video.id)
                          ? 'bg-indigo-500'
                          : 'bg-white/80 hover:bg-indigo-200'
                      )}
                    >
                      {selectedSourceIds.has(video.id) && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {/* Play button in center */}
                    {video.url && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setPlayingVideo({ url: getImageUrl(video.url), title: `视频 ${video.id.slice(0, 8)}` })
                        }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Clips Table - 9:16 thumbnails */}
        {detailData && detailData.clips.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden mb-8 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">剪辑成片 ({totalClips})</h2>
              <div className="flex items-center gap-3">
                {dirtyCount > 0 && (
                  <span className="text-xs text-amber-500 font-medium">{dirtyCount} 个待保存</span>
                )}
                <button
                  onClick={() => selectedProductId && fetchVideoDetail(selectedProductId)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-all"
                >
                  刷新
                </button>
                <button
                  onClick={handleConfirmClips}
                  disabled={!dirtyCount || confirming}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-sm text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {confirming ? '保存中...' : '确认'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">视频</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">手动剪辑</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">音乐</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">模板</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">封面图</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">发布标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">发布内容</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">合格</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">发布</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.clips.map(clip => {
                    const state = clipStates[clip.videoPushId]
                    return (
                      <tr key={clip.videoPushId} className="border-b border-slate-100 hover:bg-slate-50/50">
                        {/* Video - 9:16 thumbnail - only show when clip is ready */}
                        <td className="px-4 py-3">
                          {clip.status === 'pending' ? (
                            /* 剪辑中 - 显示占位 */
                            <div
                              className="rounded-lg overflow-hidden relative bg-slate-100 border-2 border-dashed border-slate-300"
                              style={{ aspectRatio: '9/16', width: '60px' }}
                            >
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                              </div>
                            </div>
                          ) : state?.manualClipUrl ? (
                            <div
                              className="rounded-lg overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all shadow-sm"
                              style={{ aspectRatio: '9/16', width: '60px' }}
                              onClick={() => setPlayingVideo({ url: state.manualClipUrl!, title: `视频 ${clip.videoPushId.slice(0, 8)}` })}
                            >
                              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                                <svg className="w-6 h-6 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                          ) : clip.url ? (
                            <div
                              className="rounded-lg overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all shadow-sm"
                              style={{ aspectRatio: '9/16', width: '60px' }}
                              onClick={() => setPlayingVideo({ url: clip.url, title: `视频 ${clip.videoPushId.slice(0, 8)}` })}
                            >
                              {clip.videoThumbnail ? (
                                <img src={getImageUrl(clip.videoThumbnail)} alt="thumbnail" className="w-full h-full object-cover" />
                              ) : null}
                            </div>
                          ) : (
                            /* No video - show upload hint */
                            <div
                              className="rounded-lg overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all shadow-sm border-2 border-dashed border-slate-300"
                              style={{ aspectRatio: '9/16', width: '60px' }}
                            >
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </td>
                        {/* Manual Clip - separate column */}
                        <td className="px-4 py-3">
                          {state && (
                            <VideoUploader
                              value={state.manualClipUrl || ''}
                              onChange={(url) => updateClipState(clip.videoPushId, 'manualClipUrl', url)}
                            />
                          )}
                        </td>
                        {/* Music */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 font-mono truncate max-w-[80px] block">
                            {clip.musicId || '-'}
                          </span>
                        </td>
                        {/* Template */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 truncate max-w-[80px] block">
                            {clip.templateName || '-'}
                          </span>
                        </td>
                        {/* Thumbnail */}
                        <td className="px-4 py-3">
                          {state && (
                            <ThumbnailUploader
                              value={state.thumbnail}
                              onChange={(url) => updateClipState(clip.videoPushId, 'thumbnail', url)}
                            />
                          )}
                        </td>
                        {/* Title */}
                        <td className="px-4 py-3 min-w-[180px]">
                          <textarea
                            rows={2}
                            value={state?.title || ''}
                            onChange={(e) => updateClipState(clip.videoPushId, 'title', e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 placeholder:text-slate-400 resize-none"
                            placeholder="标题"
                          />
                        </td>
                        {/* Content */}
                        <td className="px-4 py-3 min-w-[220px]">
                          <textarea
                            rows={3}
                            value={state?.content || ''}
                            onChange={(e) => updateClipState(clip.videoPushId, 'content', e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 placeholder:text-slate-400 resize-none"
                            placeholder="内容"
                          />
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs font-medium px-2.5 py-1 rounded-lg',
                            clip.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                            clip.status === 'ready' ? 'bg-amber-100 text-amber-700' :
                            clip.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          )}>
                            {clip.status === 'published' ? '已发布' : clip.status === 'ready' ? '待发布' : clip.status === 'failed' ? '失败' : '剪辑中'}
                          </span>
                        </td>
                        {/* Qualified */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={state?.isQualified || false}
                            onChange={(e) => updateClipState(clip.videoPushId, 'isQualified', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500/50"
                          />
                        </td>
                        {/* Published */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={state?.isPublished || false}
                            onChange={(e) => updateClipState(clip.videoPushId, 'isPublished', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500/50"
                          />
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* AI 填充 - 紫 */}
                            <button
                              onClick={() => handleAIFill(clip.videoPushId)}
                              disabled={state?.aiFilling}
                              className="w-8 h-8 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                              title={state?.aiFilling ? '生成中...' : 'AI 填充'}
                            >
                              {state?.aiFilling ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              )}
                            </button>
                            {/* 发布 - 靛 */}
                            <button
                              onClick={() => handleRowPublish(clip.videoPushId)}
                              className="w-8 h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center transition-all"
                              title="发布"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            {/* 推送 - 绿 */}
                            <button
                              onClick={() => handlePushClip(clip.videoPushId)}
                              disabled={!state?.isPublished}
                              className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                              title="推送"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </button>
                            {/* 目录 - 灰 */}
                            <button
                              onClick={() => clip.url && fetch('/api/tools/open-folder', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filePath: clip.url })
                              })}
                              disabled={!clip.url}
                              className="w-8 h-8 rounded-lg bg-slate-500 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                              title="打开目录"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </button>
                            {/* 删除 - 红 */}
                            <button
                              onClick={() => handleDeleteClip(clip.videoPushId)}
                              className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all"
                              title="删除"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/25 animate-fade-in">
            {successMessage}
          </div>
        )}

        {/* Video Player Modal */}
        {playingVideo && (
          <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
            <DialogContent className="bg-white border-slate-200 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-slate-900">{playingVideo.title}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <video
                  src={playingVideo.url}
                  controls
                  autoPlay
                  className="w-full rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* AI Fill Result Selection Dialog */}
        {aiFillDialog && (
          <Dialog open={!!aiFillDialog} onOpenChange={() => setAiFillDialog(null)}>
            <DialogContent className="bg-white border-slate-200 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-slate-900">选择 AI 生成的内容</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-3">
                {aiFillDialog.productImage && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <img src={getImageUrl(aiFillDialog.productImage)} alt="产品图片" className="w-16 h-16 object-cover rounded-lg" />
                    <div className="text-xs text-slate-500">{aiFillDialog.productName}</div>
                  </div>
                )}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1 font-medium">提交的提示词</div>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap break-all">{aiFillDialog.prompt}</pre>
                </div>
                {aiFillDialog.results.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (aiFillDialog) {
                        updateClipState(aiFillDialog.videoPushId, 'title', item.title)
                        updateClipState(aiFillDialog.videoPushId, 'content', item.content)
                        setAiFillDialog(null)
                        setSuccessMessage('AI 填充成功')
                        setTimeout(() => setSuccessMessage(null), 2000)
                      }
                    }}
                    className="p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                  >
                    <div className="text-sm font-medium text-slate-900 mb-1">选项 {idx + 1}</div>
                    <div className="text-sm text-slate-700 mb-2">
                      <span className="font-medium">标题：</span>{item.title}
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">内容：</span>{item.content}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
