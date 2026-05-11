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
import { ThumbnailUploader } from '@/components/daily-publish-plan/ThumbnailUploader'

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
  musicId?: string
  templateName?: string
  title?: string
  content?: string
  videoIdHash?: string
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

// Per-row editing state
interface ClipRowState {
  thumbnail: string
  title: string
  content: string
  isQualified: boolean
  isPublished: boolean
  dirty: boolean
}

export default function IpDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ipId = params.ipId as string
  const productId = params.productId as string

  const [data, setData] = useState<IpDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Video player state
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Mark unqualified dialog state
  const [unqualifiedDialogOpen, setUnqualifiedDialogOpen] = useState(false)
  const [selectedClipForUnqualified, setSelectedClipForUnqualified] = useState<Clip | null>(null)
  const [markingUnqualified, setMarkingUnqualified] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Per-row editing states
  const [clipStates, setClipStates] = useState<Record<string, ClipRowState>>({})

  useEffect(() => {
    const fetchData = async () => {
      if (!ipId || !productId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
        if (res.ok) {
          const result = await res.json()
          setData(result)
          // Initialize per-row states
          const states: Record<string, ClipRowState> = {}
          result.clips.forEach((clip: Clip) => {
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

  // Clipping state
  const [clipping, setClipping] = useState(false)

  // Clipping: call prepare-clips then clip
  const handleClip = async () => {
    setClipping(true)
    try {
      // Get videoIds from all clips
      const allVideoIds = data?.clips.flatMap(c => c.videoIds) || []

      if (allVideoIds.length === 0) {
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
          videoIds: allVideoIds,
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
          videoIds: allVideoIds,
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

  // Update row state
  const updateClipState = (videoPushId: string, field: keyof ClipRowState, value: any) => {
    setClipStates(prev => ({
      ...prev,
      [videoPushId]: {
        ...prev[videoPushId],
        [field]: value,
        dirty: true,
      },
    }))
  }

  // Batch confirm - save all dirty rows
  const handleConfirm = async () => {
    if (!data) return
    const updates = data.clips
      .filter(clip => clipStates[clip.videoPushId]?.dirty)
      .map(clip => ({
        videoPushId: clip.videoPushId,
        thumbnail: clipStates[clip.videoPushId].thumbnail,
        title: clipStates[clip.videoPushId].title,
        content: clipStates[clip.videoPushId].content,
        isQualified: clipStates[clip.videoPushId].isQualified,
        isPublished: clipStates[clip.videoPushId].isPublished,
      }))

    if (updates.length === 0) return

    setConfirming(true)
    try {
      const res = await fetch('/api/video-push/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (res.ok) {
        setSuccessMessage(`已保存 ${updates.length} 个视频`)
        setTimeout(() => setSuccessMessage(null), 3000)
        // Refresh data
        const refreshRes = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
        if (refreshRes.ok) {
          const result = await res.json()
          setData(result)
          // Reset dirty flags
          setClipStates(prev => {
            const next = { ...prev }
            updates.forEach(u => {
              if (next[u.videoPushId]) {
                next[u.videoPushId].dirty = false
              }
            })
            return next
          })
        }
      } else {
        throw new Error('Failed to save')
      }
    } catch (err) {
      console.error(err)
      alert('保存失败，请重试')
    } finally {
      setConfirming(false)
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

  // Publish single clip (quick publish)
  const handlePublishClip = async (clip: Clip) => {
    setConfirming(true)
    try {
      const res = await fetch('/api/video-push/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{
            videoPushId: clip.videoPushId,
            isPublished: true,
          }]
        }),
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
        throw new Error('Failed to publish')
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
    if (!data || data.clips.length === 0) {
      alert('没有可删除的视频')
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
          videoPushIds: data.clips.map(c => c.videoPushId),
          qualified: false
        })
      })
      if (res.ok) {
        setSuccessMessage(`已删除 ${data.clips.length} 个视频`)
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
      alert('删除失败，请重试')
    } finally {
      setMarkingUnqualified(false)
    }
  }

  // Count dirty rows
  const dirtyCount = Object.values(clipStates).filter(s => s.dirty).length

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

  const totalCount = data.clips.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
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
            <button
              onClick={handleDeleteSelected}
              disabled={totalCount === 0 || markingUnqualified}
              className="px-4 py-2 rounded-lg border border-red-200 bg-white text-sm text-red-500 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm disabled:opacity-50"
            >
              删除全部
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

        {/* Clips Section - Table layout */}
        <div className="mb-6">
          <div className="rounded-xl border border-oat bg-white shadow-clay overflow-hidden">
            <div className="px-5 py-4 border-b border-oat flex items-center justify-between">
              <h2 className="text-sm font-semibold text-warm-charcoal">剪辑成片 ({totalCount})</h2>
              {dirtyCount > 0 && (
                <span className="text-xs text-orange-500 font-medium">
                  {dirtyCount} 个待保存
                </span>
              )}
            </div>

            {data.clips.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-warm-silver text-sm">暂无剪辑成片</p>
              </div>
            ) : (
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
                    {data.clips.map(clip => {
                      const state = clipStates[clip.videoPushId]
                      return (
                        <tr key={clip.videoPushId} className="border-b border-oat/50 hover:bg-violet-50/30">
                          {/* Video - thumbnail with play */}
                          <td className="px-4 py-3">
                            <div
                              className="w-20 h-14 rounded-lg bg-matcha-100 overflow-hidden flex-shrink-0 relative cursor-pointer group"
                              onClick={() => clip.url && handlePlayVideo(clip)}
                            >
                              {clip.thumbnail || state?.thumbnail ? (
                                <>
                                  <img
                                    src={getImageUrl(state?.thumbnail || clip.thumbnail || '')}
                                    alt="thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
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
                              {clip.status !== 'published' && clip.url && (
                                <button
                                  onClick={() => handlePlayVideo(clip)}
                                  className="px-2 py-1 rounded border border-oat text-xs text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all"
                                >
                                  查看
                                </button>
                              )}
                              {clip.status === 'ready' && (
                                <button
                                  onClick={() => handlePublishClip(clip)}
                                  disabled={confirming}
                                  className="px-2 py-1 rounded bg-gradient-to-r from-violet-500 to-fuchsia-500 text-xs text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
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
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleClip}
              disabled={clipping || totalCount === 0}
              className="px-4 py-2 rounded-lg border border-oat bg-white text-sm text-warm-silver hover:bg-matcha-50 hover:border-matcha-600 transition-all shadow-sm disabled:opacity-50"
            >
              {clipping ? '剪辑中...' : '剪辑全部'}
            </button>
            <button
              onClick={handleReclip}
              disabled={clipping || totalCount === 0}
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
        {dirtyCount > 0 && (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-xl hover:scale-[1.01]"
          >
            {confirming ? '保存中...' : `确认保存 ${dirtyCount} 个视频`}
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
