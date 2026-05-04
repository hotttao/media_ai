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
  const [selectedMovementIds, setSelectedMovementIds] = useState<Set<string>>(new Set())
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

  // Available movements (for top filter)
  const availableMovements = useMemo(() => {
    const mvMap = new Map<string, JimengVideoCombination['movement']>()
    for (const c of combinations) {
      if (!mvMap.has(c.movement.id)) {
        mvMap.set(c.movement.id, c.movement)
      }
    }
    return Array.from(mvMap.values())
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

  // Filter groups based on filter type AND movement selection
  const filteredGroups = useMemo(() => {
    return groupedByFirstFrame.map(group => {
      let movements = group.movements

      // Filter by movement selection
      if (selectedMovementIds.size > 0) {
        movements = movements.filter(m => selectedMovementIds.has(m.movement.id))
      }

      if (filter === 'generated') {
        movements = movements.filter(m => m.existingVideoId)
      } else if (filter === 'pending') {
        movements = movements.filter(m => !m.existingVideoId)
      }

      return { ...group, movements }
    }).filter(group => group.movements.length > 0)
  }, [groupedByFirstFrame, filter, selectedMovementIds])

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
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
        <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div
          className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center rounded-xl border border-oat bg-white px-6 py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-matcha-600 border-t-transparent"></div>
            <span className="ml-3 text-sm text-warm-silver">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div
        className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/products/${productId}`}
            className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-violet-600 hover:shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-warm-charcoal tracking-tight">视频生成</h1>
            <p className="text-sm text-warm-silver mt-0.5">首帧图 × 动作 组合 · 批量生成视频</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 mb-6 px-4 py-3 rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex gap-3">
            {(['all', 'generated', 'pending'] as FilterType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all
                  ${filter === tab
                    ? 'bg-matcha-600 text-white'
                    : 'text-warm-silver hover:bg-oat'
                  }
                `}
              >
                {tab === 'all' ? '全部' : tab === 'generated' ? '已生成' : '待生成'}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-oat" />
          <div className="flex items-center gap-6 text-sm text-warm-silver">
            <span>已生成 <span className="font-medium text-matcha-600">{stats.generated}</span></span>
            <span>待生成 <span className="font-medium text-amber-600">{stats.pending}</span></span>
            <span>共 <span className="font-medium text-warm-charcoal">{stats.total}</span></span>
          </div>
        </div>

        {/* Movement Filter - Top */}
        <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择动作</h3>
            {availableMovements.length > 0 && (
              <div className="flex gap-3 text-xs text-warm-silver">
                <button onClick={() => setSelectedMovementIds(new Set(availableMovements.map(m => m.id)))}>全选</button>
                <span>|</span>
                <button onClick={() => setSelectedMovementIds(new Set())}>清空</button>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {availableMovements.map(mv => (
                <button
                  key={mv.id}
                  onClick={() => {
                    setSelectedMovementIds(prev => {
                      const next = new Set(prev)
                      next.has(mv.id) ? next.delete(mv.id) : next.add(mv.id)
                      return next
                    })
                  }}
                  className={`
                    rounded-full border-2 px-4 py-2 text-sm transition-all
                    ${selectedMovementIds.has(mv.id)
                      ? 'border-matcha-600 bg-matcha-600 text-white'
                      : 'border-oat hover:border-matcha-600'
                    }
                  `}
                >
                  {mv.content}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">
              已选择 {selectedMovementIds.size} / {availableMovements.length}
            </p>
          </div>
        </div>

        {/* FirstFrame Filter */}
        <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择首帧图</h3>
            {availableFirstFrames.length > 0 && (
              <div className="flex gap-3 text-xs text-warm-silver">
                <button onClick={() => setSelectedFirstFrameIds(new Set(availableFirstFrames.map(f => f.id)))}>全选</button>
                <span>|</span>
                <button onClick={() => setSelectedFirstFrameIds(new Set())}>清空</button>
              </div>
            )}
          </div>
          <div className="p-4">
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
                    ${selectedFirstFrameIds.has(ff.id) ? 'border-matcha-600 bg-matcha-50' : 'border-oat hover:border-matcha-600'}
                  `}
                >
                  {ff.url ? (
                    <img src={getImageUrl(ff.url)} alt="" className="w-14 aspect-9x16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 aspect-9x16 rounded-lg bg-oat flex items-center justify-center text-xs text-warm-silver">无图片</div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">
              已选择 {selectedFirstFrameIds.size} / {availableFirstFrames.length}
            </p>
          </div>
        </div>

        {/* Combinations List */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">首帧图 × 动作 组合</h3>
            <div className="flex items-center gap-4 text-xs text-warm-silver">
              <span>已生成 <span className="font-medium text-matcha-600">{stats.generated}</span></span>
              <span>待生成 <span className="font-medium text-amber-600">{stats.pending}</span></span>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {filteredGroups.flatMap(group =>
                group.movements.map(combo => {
                  const isGenerated = !!combo.existingVideoId
                  const isSelected = selectedCombinations.has(combo.id)
                  return (
                    <div key={combo.id} className={`
                      flex items-center justify-between rounded-lg border px-4 py-3
                      ${isGenerated ? 'border-matcha-600/30 bg-matcha-50/50' : 'border-oat bg-white hover:border-matcha-600'}
                      ${isSelected && !isGenerated ? 'ring-2 ring-matcha-600 ring-offset-1' : ''}
                    `}>
                      <div className="flex items-center gap-3">
                        {!isGenerated && (
                          <button
                            onClick={() => handleToggleMovement(combo.id, combo.existingVideoId)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-matcha-600 border-matcha-600' : 'border-gray-300'}`}
                          >
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </button>
                        )}
                        {isGenerated && <div className="w-5" />}
                        {group.firstFrame.url && <img src={getImageUrl(group.firstFrame.url)} alt="" className="w-12 aspect-9x16 rounded-lg object-cover" />}
                        <span className="text-warm-silver">×</span>
                        <span className="text-sm text-warm-charcoal">{combo.movement.content}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {isGenerated && combo.resultUrl && (
                          <>
                            <span className="text-warm-silver">→</span>
                            <img src={getImageUrl(combo.resultUrl)} alt="" className="w-16 aspect-video rounded-lg object-cover" />
                          </>
                        )}
                        <Badge variant={isGenerated ? 'success' : 'warning'} className="text-xs">
                          {isGenerated ? '已生成' : '待生成'}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          {stats.pending > 0 && (
            <div className="flex items-center justify-between border-t border-oat px-4 py-3">
              <div className="flex gap-2 text-xs text-warm-silver">
                <button onClick={() => setSelectedCombinations(new Set(filteredGroups.flatMap(g => g.movements.filter(m => !m.existingVideoId).map(m => m.id))))}>全选待生成</button>
                <span>|</span>
                <button onClick={() => setSelectedCombinations(new Set())}>清空选择</button>
              </div>
              <Button onClick={handleGenerate} disabled={selectedCombinations.size === 0 || generating} className="bg-matcha-600 hover:bg-matcha-500">
                {generating ? '生成中...' : `生成 ${selectedCombinations.size > 0 ? `(${selectedCombinations.size})` : ''}`}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认生成</DialogTitle>
            <DialogDescription>
              已选择 {selectedCombinations.size} 个组合，其中部分已生成过视频。
              重新生成可能会覆盖现有视频，确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={performGenerate} className="bg-matcha-600 hover:bg-matcha-500">
              确认生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
