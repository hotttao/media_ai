'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface JimengVideoCombination {
  id: string // "firstFrameId-movementId"
  firstFrame: { id: string; url: string; poseId: string }
  movement: { id: string; content: string }
  existingVideoId: string | null
}

export default function JimengVideoPage() {
  const [loading, setLoading] = useState(true)
  const [combinations, setCombinations] = useState<JimengVideoCombination[]>([])
  const [selectedFirstFrameIds, setSelectedFirstFrameIds] = useState<Set<string>>(new Set())
  const [selectedMovementIds, setSelectedMovementIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/jimeng-videos')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: JimengVideoCombination[]) => {
        setCombinations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // 去重获取首帧图选项
  const firstFrames = Array.from(
    new Map(combinations.map(c => [c.firstFrame.id, c.firstFrame])).values()
  )

  // 去重获取动作选项
  const movements = Array.from(
    new Map(combinations.map(c => [c.movement.id, c.movement])).values()
  )

  // 根据已选首帧图的 poseId 过滤动作
  const filteredMovements = selectedFirstFrameIds.size > 0
    ? movements.filter(movement =>
        Array.from(selectedFirstFrameIds).some(firstFrameId => {
          const combo = combinations.find(
            c => c.firstFrame.id === firstFrameId && c.movement.id === movement.id
          )
          return combo !== undefined
        })
      )
    : movements

  // 计算有效组合
  const validCombinations = selectedFirstFrameIds.size > 0 && selectedMovementIds.size > 0
    ? Array.from(selectedMovementIds).flatMap(movementId =>
        Array.from(selectedFirstFrameIds)
          .map(firstFrameId => {
            const combo = combinations.find(
              c => c.firstFrame.id === firstFrameId && c.movement.id === movementId
            )
            if (!combo) return null
            return {
              id: combo.id,
              firstFrameId: combo.firstFrame.id,
              firstFrameUrl: combo.firstFrame.url,
              movementId: combo.movement.id,
              movementContent: combo.movement.content,
              existingVideoId: combo.existingVideoId,
            }
          })
          .filter((c): c is NonNullable<typeof c> => c !== null)
      )
    : []

  const pendingCount = validCombinations.filter(c => !c.existingVideoId).length

  const handleFirstFrameToggle = (firstFrameId: string) => {
    setSelectedFirstFrameIds(prev => {
      const next = new Set(prev)
      if (next.has(firstFrameId)) {
        next.delete(firstFrameId)
      } else {
        next.add(firstFrameId)
      }
      return next
    })
    // 清除已选的动作，重新选择
    setSelectedMovementIds(new Set())
  }

  const handleMovementToggle = (movementId: string) => {
    setSelectedMovementIds(prev => {
      const next = new Set(prev)
      if (next.has(movementId)) {
        next.delete(movementId)
      } else {
        next.add(movementId)
      }
      return next
    })
  }

  const handleGenerate = async () => {
    if (pendingCount === 0) return

    setGenerating(true)
    const results: { combo: typeof validCombinations[0]; success: boolean }[] = []
    try {
      for (const combo of validCombinations.filter(c => !c.existingVideoId)) {
        const comboData = combinations.find(c => c.id === combo.id)
        if (!comboData) {
          results.push({ combo, success: false })
          continue
        }

        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'jimeng-video',
            firstFrameId: comboData.firstFrame.id,
            movementId: comboData.movement.id,
          }),
        })
        results.push({ combo, success: res.ok })
      }
      const failed = results.filter(r => !r.success)
      if (failed.length > 0) {
        alert(`生成完成，${failed.length} 个失败`)
      } else {
        alert('已提交生成任务')
      }
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <CombinationToolPage title="即梦生视频" description="选择首帧图和动作，生成即梦视频" icon="🎬">
        <div className="flex items-center justify-center rounded-xl border border-oat bg-white px-6 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-matcha-600 border-t-transparent"></div>
          <span className="ml-3 text-sm text-warm-silver">加载中...</span>
        </div>
      </CombinationToolPage>
    )
  }

  return (
    <CombinationToolPage title="即梦生视频" description="选择首帧图和动作，生成即梦视频" icon="🎬">
      <div className="space-y-8">
        {/* 首帧图选择 - 多选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择首帧图</h3>
            {selectedFirstFrameIds.size > 0 && (
              <div className="flex gap-2 text-xs text-warm-silver">
                <button
                  onClick={() => setSelectedFirstFrameIds(new Set(firstFrames.map(f => f.id)))}
                  className="hover:text-foreground"
                >
                  全选
                </button>
                <span>|</span>
                <button
                  onClick={() => setSelectedFirstFrameIds(new Set())}
                  className="hover:text-foreground"
                >
                  清空
                </button>
              </div>
            )}
          </div>
          <div className="p-4">
            {firstFrames.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用首帧图</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {firstFrames.map(firstFrame => (
                  <button
                    key={firstFrame.id}
                    onClick={() => handleFirstFrameToggle(firstFrame.id)}
                    className={cn(
                      'relative rounded-xl border-2 transition-all',
                      selectedFirstFrameIds.has(firstFrame.id)
                        ? 'border-matcha-600'
                        : 'border-transparent hover:border-matcha-400'
                    )}
                  >
                    {firstFrame.url ? (
                      <img
                        src={getImageUrl(firstFrame.url)}
                        alt={firstFrame.id}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-oat text-xs text-warm-silver">
                        无图片
                      </div>
                    )}
                    {selectedFirstFrameIds.has(firstFrame.id) && (
                      <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-matcha-600 text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">
              已选择 {selectedFirstFrameIds.size} / {firstFrames.length}
            </p>
          </div>
        </div>

        {/* 动作选择 - 多选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择动作</h3>
            {selectedFirstFrameIds.size > 0 && (
              <div className="flex gap-2 text-xs text-warm-silver">
                <button
                  onClick={() => setSelectedMovementIds(new Set(filteredMovements.map(m => m.id)))}
                  className="hover:text-foreground"
                >
                  全选
                </button>
                <span>|</span>
                <button
                  onClick={() => setSelectedMovementIds(new Set())}
                  className="hover:text-foreground"
                >
                  清空
                </button>
              </div>
            )}
          </div>
          <div className="p-4">
            {selectedFirstFrameIds.size === 0 ? (
              <p className="text-sm text-warm-silver">请先选择首帧图</p>
            ) : filteredMovements.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用动作</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {filteredMovements.map(movement => (
                  <button
                    key={movement.id}
                    onClick={() => handleMovementToggle(movement.id)}
                    className={cn(
                      'relative rounded-xl border-2 px-4 py-2 transition-all',
                      selectedMovementIds.has(movement.id)
                        ? 'border-matcha-600 bg-matcha-50'
                        : 'border-oat hover:border-matcha-600'
                    )}
                  >
                    <span className="text-sm font-medium">{movement.content}</span>
                    {selectedMovementIds.has(movement.id) && (
                      <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-matcha-600 text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">
              已选择 {selectedMovementIds.size} / {filteredMovements.length}
            </p>
          </div>
        </div>

        {/* 组合预览 */}
        {validCombinations.length > 0 && (
          <div className="rounded-xl border border-oat bg-white shadow-clay">
            <div className="flex items-center justify-between border-b border-oat px-4 py-3">
              <h3 className="text-sm font-semibold">生成的组合</h3>
              <span className="text-xs text-warm-silver">
                待生成 <span className="font-medium text-foreground">{pendingCount}</span>
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto p-4">
              <div className="space-y-2">
                {validCombinations.map(combo => (
                  <div
                    key={combo.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2',
                      !combo.existingVideoId && 'border-oat bg-white',
                      combo.existingVideoId && 'border-matcha-600/30 bg-matcha-50'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <img
                        src={getImageUrl(combo.firstFrameUrl)}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                      <span className="text-warm-silver">×</span>
                      <span>{combo.movementContent}</span>
                    </div>
                    {combo.existingVideoId && (
                      <Badge variant="success" className="text-xs">已存在</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 生成按钮 */}
        <div className="flex items-center justify-end">
          <Button
            onClick={handleGenerate}
            disabled={
              selectedFirstFrameIds.size === 0 ||
              selectedMovementIds.size === 0 ||
              pendingCount === 0 ||
              generating
            }
            className="bg-matcha-600 hover:bg-matcha-500"
          >
            {generating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                生成中...
              </>
            ) : (
              <>生成 {pendingCount > 0 && `(${pendingCount})`}</>
            )}
          </Button>
        </div>
      </div>
    </CombinationToolPage>
  )
}
