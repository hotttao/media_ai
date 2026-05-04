'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getImageUrl } from '@/foundation/lib/utils'

interface JimengVideoCombination {
  id: string
  firstFrame: { id: string; url: string; poseId: string | null; productId: string }
  movement: { id: string; content: string }
  existingVideoId: string | null
  resultUrl: string | null
}

type FilterType = 'all' | 'generated' | 'pending'

export default function VideoWizardPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [combinations, setCombinations] = useState<JimengVideoCombination[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set())
  const [selectedFirstFrameIds, setSelectedFirstFrameIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // Fetch combinations
  useEffect(() => {
    fetch(`/api/tools/combination/jimeng-videos?productId=${productId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: JimengVideoCombination[]) => {
        const filtered = data.filter(combo => combo.firstFrame.productId === productId)
        setCombinations(filtered)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [productId])

  // Available first frames for filter
  const availableFirstFrames = useMemo(() => {
    const ffMap = new Map<string, JimengVideoCombination['firstFrame']>()
    for (const c of combinations) {
      if (!ffMap.has(c.firstFrame.id)) {
        ffMap.set(c.firstFrame.id, c.firstFrame)
      }
    }
    return Array.from(ffMap.values())
  }, [combinations])

  // Group combinations by firstFrame
  const groupedByFirstFrame = useMemo(() => {
    const groupMap = new Map<string, {
      firstFrame: { id: string; url: string; poseId: string | null }
      movements: JimengVideoCombination[]
    }>()

    for (const combo of combinations) {
      const ffId = combo.firstFrame.id
      if (!groupMap.has(ffId)) {
        groupMap.set(ffId, {
          firstFrame: combo.firstFrame,
          movements: [],
        })
      }
      groupMap.get(ffId)!.movements.push(combo)
    }

    return Array.from(groupMap.values())
  }, [combinations])

  // Filter groups based on filter type AND firstFrame selection
  const filteredGroups = useMemo(() => {
    return groupedByFirstFrame.map(group => {
      let movements = group.movements

      // Filter by firstFrame selection
      if (selectedFirstFrameIds.size > 0 && !selectedFirstFrameIds.has(group.firstFrame.id)) {
        return { ...group, movements: [] }
      }

      if (filter === 'generated') {
        movements = movements.filter(m => m.existingVideoId)
      } else if (filter === 'pending') {
        movements = movements.filter(m => !m.existingVideoId)
      }

      return { ...group, movements }
    }).filter(group => group.movements.length > 0)
  }, [groupedByFirstFrame, filter, selectedFirstFrameIds])

  // Count statistics
  const stats = useMemo(() => {
    const total = combinations.length
    const generated = combinations.filter(c => c.existingVideoId).length
    const pending = total - generated
    return { total, generated, pending }
  }, [combinations])

  const handleToggleMovement = (combinationId: string, existingVideoId: string | null) => {
    if (existingVideoId) return

    setSelectedCombinations(prev => {
      const next = new Set(prev)
      if (next.has(combinationId)) {
        next.delete(combinationId)
      } else {
        next.add(combinationId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const pendingIds = combinations
      .filter(c => !c.existingVideoId)
      .map(c => c.id)
    setSelectedCombinations(new Set(pendingIds))
  }

  const handleDeselectAll = () => {
    setSelectedCombinations(new Set())
  }

  const handleGenerate = async () => {
    if (selectedCombinations.size === 0) return

    const selectedGenerated = combinations.filter(
      c => selectedCombinations.has(c.id) && c.existingVideoId
    )

    if (selectedGenerated.length > 0) {
      setConfirmDialogOpen(true)
      return
    }

    await performGenerate()
  }

  const performGenerate = async () => {
    setConfirmDialogOpen(false)
    setGenerating(true)

    try {
      const combos = combinations.filter(c => selectedCombinations.has(c.id))
      const failures: string[] = []

      for (const combo of combos) {
        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'jimeng-video',
            firstFrameId: combo.firstFrame.id,
            movementId: combo.movement.id,
          }),
        })
        if (!res.ok) {
          failures.push(combo.movement.content)
        }
      }

      if (failures.length > 0) {
        alert(`部分生成失败: ${failures.join(', ')}`)
      } else {
        alert('已提交生成任务')
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-charcoal">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl border border-charcoal-subtle bg-charcoal-panel">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-sm text-silver">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-deep-charcoal text-white">
      {/* Subtle grid pattern overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-charcoal-via to-deep-charcoal opacity-50 pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-5 mb-10">
          <Link
            href={`/products/${productId}`}
            className="w-11 h-11 rounded-xl bg-charcoal-panel border border-charcoal-subtle flex items-center justify-center text-silver hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">视频生成</h1>
            <p className="text-sm text-silver mt-1">首帧图 × 动作 组合 · 批量生成视频</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-8 px-5 py-4 rounded-2xl bg-charcoal-panel border border-charcoal-subtle">
          <div className="flex gap-3">
            {(['all', 'generated', 'pending'] as FilterType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all
                  ${filter === tab
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'text-silver hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {tab === 'all' ? '全部' : tab === 'generated' ? '已生成' : '待生成'}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-charcoal-subtle" />
          <div className="flex items-center gap-6 text-sm">
            <span className="text-silver">已生成 <span className="text-emerald-400 font-semibold">{stats.generated}</span></span>
            <span className="text-silver">待生成 <span className="text-amber-400 font-semibold">{stats.pending}</span></span>
            <span className="text-silver">共 <span className="text-white font-semibold">{stats.total}</span></span>
          </div>
        </div>

        {/* FirstFrame Filter */}
        <div className="mb-8 px-5 py-4 rounded-2xl bg-charcoal-panel border border-charcoal-subtle">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">选择首帧图</h3>
            {availableFirstFrames.length > 0 && (
              <div className="flex gap-3 text-xs text-silver">
                <button onClick={() => setSelectedFirstFrameIds(new Set(availableFirstFrames.map(f => f.id)))}>全选</button>
                <span>|</span>
                <button onClick={() => setSelectedFirstFrameIds(new Set())}>清空</button>
              </div>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {availableFirstFrames.map(ff => (
              <button
                key={ff.id}
                onClick={() => {
                  setSelectedFirstFrameIds(prev => {
                    const next = new Set(prev)
                    next.has(ff.id) ? next.delete(ff.id) : next.add(ff.id)
                    return next
                  })
                }}
                className={`
                  flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all flex-shrink-0
                  ${selectedFirstFrameIds.has(ff.id) ? 'border-emerald-500 bg-emerald-500/10' : 'border-charcoal-subtle hover:border-emerald-500/50'}
                `}
              >
                {ff.url ? (
                  <img src={getImageUrl(ff.url)} alt="" className="w-14 aspect-9x16 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 aspect-9x16 rounded-lg bg-charcoal-subtle flex items-center justify-center text-xs text-silver">无图片</div>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-silver">
            已选择 {selectedFirstFrameIds.size} / {availableFirstFrames.length}
          </div>
        </div>

        {/* FirstFrame Cards */}
        <div className="space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-charcoal-subtle bg-charcoal-panel px-8 py-16 text-center">
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-silver">暂无可用组合</p>
              <p className="text-sm text-silver/60 mt-1">请先在生图向导中生成首帧图</p>
            </div>
          ) : (
            filteredGroups.map((group, groupIndex) => {
              const generatedCount = group.movements.filter(m => m.existingVideoId).length
              const progress = generatedCount / group.movements.length

              return (
                <div
                  key={group.firstFrame.id}
                  className="rounded-2xl border border-charcoal-subtle bg-charcoal-panel overflow-hidden"
                >
                  {/* FirstFrame Header */}
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-charcoal-subtle">
                    <div className="relative">
                      {group.firstFrame.url ? (
                        <img
                          src={getImageUrl(group.firstFrame.url)}
                          alt="首帧图"
                          className="w-14 aspect-9x16 rounded-lg object-cover ring-2 ring-emerald-500/20"
                        />
                      ) : (
                        <div className="w-14 aspect-9x16 rounded-lg bg-charcoal-subtle flex items-center justify-center text-xs text-silver">
                          无图片
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="text-[10px] font-bold">{generatedCount}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white">首帧图</span>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-1.5 bg-charcoal-subtle rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-silver">{generatedCount}/{group.movements.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Movements Grid */}
                  <div className="p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {group.movements.map(combo => {
                        const isGenerated = !!combo.existingVideoId
                        const isSelected = selectedCombinations.has(combo.id)

                        return (
                          <div
                            key={combo.id}
                            className={`
                              relative rounded-xl border overflow-hidden transition-all duration-200
                              ${isGenerated
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : isSelected
                                  ? 'border-emerald-500 bg-emerald-500/10'
                                  : 'border-charcoal-subtle bg-charcoal-subtle/50 hover:border-emerald-500/50 hover:bg-charcoal-subtle'
                              }
                            `}
                          >
                            {!isGenerated && (
                              <button
                                onClick={() => handleToggleMovement(combo.id, combo.existingVideoId)}
                                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                                style={{
                                  backgroundColor: isSelected ? '#10b981' : 'rgba(0,0,0,0.5)',
                                  borderColor: isSelected ? '#10b981' : 'rgba(255,255,255,0.2)'
                                }}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            )}

                            {isGenerated && combo.resultUrl && (
                              <img
                                src={getImageUrl(combo.resultUrl)}
                                alt=""
                                className="w-full aspect-video object-cover"
                              />
                            )}

                            <div className="p-3">
                              <p className="text-sm font-medium text-white truncate">{combo.movement.content}</p>
                              {isGenerated && (
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-xs text-emerald-400">已生成</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Actions */}
        {stats.total > 0 && stats.pending > 0 && (
          <div className="flex items-center justify-between mt-8 px-6 py-4 rounded-2xl border border-charcoal-subtle bg-charcoal-panel">
            <div className="flex gap-5">
              <button
                onClick={handleSelectAll}
                className="text-sm text-silver hover:text-white transition-colors"
              >
                全选待生成
              </button>
              <span className="text-charcoal-subtle">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-sm text-silver hover:text-white transition-colors"
              >
                清空选择
              </button>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={selectedCombinations.size === 0 || generating}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white border-0 px-6"
            >
              {generating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  生成中...
                </>
              ) : (
                <>生成 {selectedCombinations.size > 0 && `(${selectedCombinations.size})`}</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-charcoal-panel border-charcoal-subtle text-white">
          <DialogHeader>
            <DialogTitle className="text-white">确认生成</DialogTitle>
            <DialogDescription className="text-silver">
              已选择 {selectedCombinations.size} 个组合，其中部分已生成过视频。
              重新生成可能会覆盖现有视频，确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} className="border-charcoal-subtle text-silver hover:text-white hover:bg-charcoal-subtle">
              取消
            </Button>
            <Button onClick={performGenerate} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white border-0">
              确认生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
