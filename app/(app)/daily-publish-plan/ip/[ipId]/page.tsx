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
  musicId?: string
  templateName?: string
  title?: string
  content?: string
}

// Per-row editing state
interface ClipRowState {
  thumbnail: string
  title: string
  content: string
  isQualified: boolean
  isPublished: boolean
  dirty: boolean
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

    const updates = dirtyClips.map(([videoPushId, state]) => ({
      videoPushId,
      thumbnail: state.thumbnail,
      title: state.title,
      content: state.content,
      isQualified: state.isQualified,
      isPublished: state.isPublished,
    }))

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

        {/* Source Video List */}
        <div className="rounded-2xl border border-oat bg-white shadow-clay overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-oat flex items-center justify-between">
            <h2 className="text-sm font-semibold text-warm-charcoal">AI 生成视频</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClip}
                disabled={selectedSourceIds.size === 0 || clipping}
                className="px-3 py-1.5 rounded-lg border border-oat bg-white text-xs text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm disabled:opacity-50"
              >
                {clipping ? '剪辑中...' : '剪辑'}
              </button>
              <button
                onClick={() => {
                  if (!selectedProductId) return
                  router.push(`/products/${selectedProductId}/video-wizard?ipId=${ipId}`)
                }}
                className="px-3 py-1.5 rounded-lg border border-oat bg-white text-xs text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm"
              >
                新增
              </button>
              <span className="text-xs text-warm-silver ml-2">选择后点击剪辑</span>
            </div>
          </div>
          {/* Scene filter */}
          {availableScenes.length > 0 && (
            <div className="px-5 py-3 border-b border-oat/50 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-warm-silver whitespace-nowrap">场景：</span>
              <button
                onClick={() => setSelectedSceneId(null)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all',
                  selectedSceneId === null
                    ? 'bg-violet-500 text-white'
                    : 'bg-white text-warm-silver border border-oat hover:bg-violet-50'
                )}
              >
                全部
              </button>
              {availableScenes.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSceneId(s.id)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5',
                    selectedSceneId === s.id
                      ? 'bg-violet-500 text-white'
                      : 'bg-white text-warm-silver border border-oat hover:bg-violet-50'
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
          <div className="divide-y divide-oat/50">
            {!detailData || detailData.videos.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-warm-silver text-sm">暂无 AI 视频</p>
              </div>
            ) : (
              detailData.videos
                .filter(v => selectedSceneId === null || v.sceneId === selectedSceneId)
                .map(video => (
                <div
                  key={video.id}
                  onClick={() => toggleSourceSelection(video.id)}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-violet-50/50 transition-colors',
                    selectedSourceIds.has(video.id) ? 'bg-violet-50/50' : ''
                  )}
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

        {/* Clips Table */}
        {detailData && detailData.clips.length > 0 && (
          <div className="rounded-xl border border-oat bg-white shadow-clay overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-oat flex items-center justify-between">
              <h2 className="text-sm font-semibold text-warm-charcoal">剪辑成片 ({totalClips})</h2>
              <div className="flex items-center gap-3">
                {dirtyCount > 0 && (
                  <span className="text-xs text-orange-500 font-medium">{dirtyCount} 个待保存</span>
                )}
                <button
                  onClick={handleConfirmClips}
                  disabled={!dirtyCount || confirming}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-xs text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {confirming ? '保存中...' : '确认'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-oat bg-violet-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">视频</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">音乐</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">模板</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">封面图</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">发布标题</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">发布内容</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">合格</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">发布</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-warm-charcoal">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.clips.map(clip => {
                    const state = clipStates[clip.videoPushId]
                    return (
                      <tr key={clip.videoPushId} className="border-b border-oat/50 hover:bg-violet-50/30">
                        {/* Video - thumbnail with play */}
                        <td className="px-4 py-3">
                          <div
                            className="w-20 h-14 rounded-lg bg-matcha-100 overflow-hidden flex-shrink-0 relative cursor-pointer group"
                            onClick={() => clip.url && setPlayingVideo({ url: clip.url, title: `视频 ${clip.videoPushId.slice(0, 8)}` })}
                          >
                            {(state?.thumbnail || clip.thumbnail) ? (
                              <img src={getImageUrl(state?.thumbnail || clip.thumbnail || '')} alt="thumbnail" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-matcha-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Music */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-warm-silver font-mono truncate max-w-[80px] block">
                            {clip.musicId || '-'}
                          </span>
                        </td>
                        {/* Template */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-warm-silver truncate max-w-[80px] block">
                            {clip.templateName || '-'}
                          </span>
                        </td>
                        {/* Thumbnail uploader */}
                        <td className="px-4 py-3">
                          {state && (
                            <ThumbnailUploader
                              value={state.thumbnail}
                              onChange={(url) => updateClipState(clip.videoPushId, 'thumbnail', url)}
                              disabled={clip.status === 'published'}
                            />
                          )}
                        </td>
                        {/* Title */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={state?.title || ''}
                            onChange={(e) => updateClipState(clip.videoPushId, 'title', e.target.value)}
                            disabled={clip.status === 'published'}
                            className="w-full px-2 py-1.5 text-xs border border-oat rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50"
                            placeholder="标题"
                          />
                        </td>
                        {/* Content */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={state?.content || ''}
                            onChange={(e) => updateClipState(clip.videoPushId, 'content', e.target.value)}
                            disabled={clip.status === 'published'}
                            className="w-full px-2 py-1.5 text-xs border border-oat rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50"
                            placeholder="内容"
                          />
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={cn(
                            'text-xs font-medium px-2 py-1 rounded',
                            clip.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                            clip.status === 'ready' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-warm-silver'
                          )}>
                            {clip.status === 'published' ? '已发布' : clip.status === 'ready' ? '待发布' : '剪辑中'}
                          </span>
                        </td>
                        {/* Qualified */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={state?.isQualified || false}
                            onChange={(e) => updateClipState(clip.videoPushId, 'isQualified', e.target.checked)}
                            disabled={clip.status === 'published'}
                            className="w-4 h-4 rounded border-oat text-violet-600 focus:ring-violet-500"
                          />
                        </td>
                        {/* Published */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={state?.isPublished || false}
                            onChange={(e) => updateClipState(clip.videoPushId, 'isPublished', e.target.checked)}
                            disabled={clip.status === 'published'}
                            className="w-4 h-4 rounded border-oat text-violet-600 focus:ring-violet-500"
                          />
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              disabled
                              title="AI 填充"
                              className="px-2 py-1 rounded border border-oat text-xs text-warm-silver opacity-50 cursor-not-allowed"
                            >
                              AI填充
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
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-matcha-600 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in">
            {successMessage}
          </div>
        )}
      </div>

          </div>
  )
}
