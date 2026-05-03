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
        // Filter to only show combinations for this product (by checking if any combination matches product's firstFrame)
        const filtered = data.filter(combo => combo.firstFrame.productId === productId)
        setCombinations(filtered)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [productId])

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

  // Filter groups based on filter type
  const filteredGroups = useMemo(() => {
    return groupedByFirstFrame.map(group => {
      let movements = group.movements

      if (filter === 'generated') {
        movements = movements.filter(m => m.existingVideoId)
      } else if (filter === 'pending') {
        movements = movements.filter(m => !m.existingVideoId)
      }

      return { ...group, movements }
    }).filter(group => group.movements.length > 0)
  }, [groupedByFirstFrame, filter])

  // Count statistics
  const stats = useMemo(() => {
    const total = combinations.length
    const generated = combinations.filter(c => c.existingVideoId).length
    const pending = total - generated
    return { total, generated, pending }
  }, [combinations])

  const handleToggleMovement = (combinationId: string, existingVideoId: string | null) => {
    // If already generated, don't allow toggle
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

    // Check if any selected are already generated
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
            <h1 className="text-2xl font-bold text-warm-charcoal tracking-tight">生视频向导</h1>
            <p className="text-sm text-warm-silver mt-0.5">选择首帧图和动作，批量生成视频</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex rounded-xl border border-oat bg-white shadow-clay overflow-hidden">
            {(['all', 'generated', 'pending'] as FilterType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`
                  px-4 py-2 text-sm font-medium transition-all
                  ${filter === tab
                    ? 'bg-matcha-600 text-white'
                    : 'text-warm-silver hover:bg-oat'
                  }
                  ${tab === 'all' ? 'rounded-l-xl' : ''}
                  ${tab === 'pending' ? 'rounded-r-xl' : ''}
                `}
              >
                {tab === 'all' ? '全部' : tab === 'generated' ? '已生成' : '未生成'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-warm-silver">
            <span>
              已生成 <span className="font-medium text-matcha-600">{stats.generated}</span>
            </span>
            <span>
              待生成 <span className="font-medium text-amber-600">{stats.pending}</span>
            </span>
            <span>
              共 <span className="font-medium text-foreground">{stats.total}</span>
            </span>
          </div>
        </div>

        {/* FirstFrame Rows */}
        <div className="space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="rounded-xl border border-oat bg-white shadow-clay px-6 py-12 text-center">
              <p className="text-sm text-warm-silver">暂无可用组合</p>
            </div>
          ) : (
            filteredGroups.map(group => (
              <div key={group.firstFrame.id} className="rounded-xl border border-oat bg-white shadow-clay overflow-hidden">
                {/* FirstFrame Header */}
                <div className="flex items-center gap-4 border-b border-oat px-4 py-3">
                  {group.firstFrame.url ? (
                    <img
                      src={getImageUrl(group.firstFrame.url)}
                      alt="首帧图"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-oat flex items-center justify-center text-xs text-warm-silver">
                      无图片
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium">首帧图</span>
                    <span className="ml-2 text-xs text-warm-silver">
                      {group.movements.filter(m => m.existingVideoId).length} / {group.movements.length} 已生成
                    </span>
                  </div>
                </div>

                {/* Movements */}
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {group.movements.map(combo => {
                      const isGenerated = !!combo.existingVideoId
                      const isSelected = selectedCombinations.has(combo.id)

                      return (
                        <div key={combo.id}>
                          <button
                            onClick={() => handleToggleMovement(combo.id, combo.existingVideoId)}
                            disabled={isGenerated}
                            className={`
                              flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm transition-all
                              ${isGenerated
                                ? 'border-matcha-600/30 bg-matcha-50/50 text-matcha-600 cursor-default'
                                : isSelected
                                  ? 'border-matcha-600 bg-matcha-600 text-white'
                                  : 'border-oat hover:border-matcha-600'
                              }
                            `}
                          >
                            {isGenerated && (
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {!isGenerated && !isSelected && (
                              <svg className="w-4 h-4 mr-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
                              </svg>
                            )}
                            {!isGenerated && isSelected && (
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            <span>{combo.movement.content}</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {stats.total > 0 && stats.pending > 0 && (
          <div className="flex items-center justify-between mt-6 rounded-xl border border-oat bg-white shadow-clay px-4 py-3">
            <div className="flex gap-4">
              <button
                onClick={handleSelectAll}
                className="text-xs text-warm-silver hover:text-foreground transition-colors"
              >
                全选待生成
              </button>
              <span className="text-warm-silver">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-xs text-warm-silver hover:text-foreground transition-colors"
              >
                清空选择
              </button>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={selectedCombinations.size === 0 || generating}
              className="bg-matcha-600 hover:bg-matcha-500"
            >
              {generating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
