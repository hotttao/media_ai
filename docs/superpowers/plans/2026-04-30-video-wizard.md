# 生视频向导实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现产品详情页的生视频向导入口和生视频向导页面

**Architecture:**
- 新建向导页面：`/products/[id]/video-wizard`
- 在产品详情页添加"生视频"按钮
- 复用 `/api/tools/combination/jimeng-videos` API 获取数据

**Tech Stack:** Next.js App Router, React, TypeScript

---

## 文件结构

```
新建:
- app/(app)/products/[id]/video-wizard/page.tsx

修改:
- app/(app)/products/[id]/ProductDetail.tsx  # 添加生视频按钮
```

---

## Task 1: 创建生视频向导页面

**Files:**
- Create: `app/(app)/products/[id]/video-wizard/page.tsx`

- [ ] **Step 1: 创建向导页面组件**

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface VideoCombination {
  id: string
  firstFrame: {
    id: string
    url: string
    poseId: string
  }
  movement: {
    id: string
    content: string
  }
  existingVideoId: string | null
}

type FilterType = 'all' | 'generated' | 'pending'

export default function VideoWizardPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [combinations, setCombinations] = useState<VideoCombination[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/jimeng-videos')
      .then(res => res.json())
      .then((data: VideoCombination[]) => {
        setCombinations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // 按首帧图分组
  const groupedCombinations = useMemo(() => {
    const groups = new Map<string, VideoCombination[]>()
    for (const combo of combinations) {
      const ffId = combo.firstFrame.id
      if (!groups.has(ffId)) {
        groups.set(ffId, [])
      }
      groups.get(ffId)!.push(combo)
    }
    return Array.from(groups.entries()).map(([ffId, combos]) => ({
      firstFrame: combos[0].firstFrame,
      movements: combos.map(c => ({
        id: c.movement.id,
        content: c.movement.content,
        existingVideoId: c.existingVideoId,
        key: c.id,
      })),
    }))
  }, [combinations])

  // 根据筛选条件过滤
  const filteredGroups = useMemo(() => {
    if (filter === 'all') return groupedCombinations
    if (filter === 'generated') {
      return groupedCombinations.filter(group =>
        group.movements.some(m => m.existingVideoId)
      )
    }
    return groupedCombinations.filter(group =>
      group.movements.some(m => !m.existingVideoId)
    )
  }, [groupedCombinations, filter])

  // 待生成组合数量
  const pendingCount = combinations.filter(c => !c.existingVideoId).length

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedCombinations.size === pendingCount) {
      setSelectedCombinations(new Set())
    } else {
      const allPending = combinations
        .filter(c => !c.existingVideoId)
        .map(c => c.id)
      setSelectedCombinations(new Set(allPending))
    }
  }

  // 切换动作选择
  const toggleSelection = (key: string, existingVideoId: string | null) => {
    if (existingVideoId) return // 已生成的不允许取消
    setSelectedCombinations(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // 批量生成
  const handleGenerate = async () => {
    if (selectedCombinations.size === 0) return

    const hasGenerated = Array.from(selectedCombinations).some(key => {
      const combo = combinations.find(c => c.id === key)
      return combo && combo.existingVideoId
    })

    if (hasGenerated) {
      setShowConfirm(true)
      return
    }

    await doGenerate()
  }

  const doGenerate = async () => {
    setShowConfirm(false)
    setGenerating(true)

    try {
      const results: { success: boolean; key: string }[] = []

      for (const key of selectedCombinations) {
        const combo = combinations.find(c => c.id === key)
        if (!combo) continue

        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'jimeng-video',
            firstFrameId: combo.firstFrame.id,
            movementId: combo.movement.id,
          }),
        })

        results.push({ success: res.ok, key })
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
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* 返回按钮和标题 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-violet-600 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">返回</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">生视频向导</h1>
        </div>

        {/* 筛选菜单 */}
        <div className="mb-6 flex gap-2">
          {(['all', 'generated', 'pending'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => {
                setFilter(f)
                setSelectedCombinations(new Set())
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-violet-50'
              )}
            >
              {f === 'all' ? '全部' : f === 'generated' ? '已生成' : '未生成'}
            </button>
          ))}
        </div>

        {/* 首帧图×动作列表 */}
        <div className="space-y-4">
          {filteredGroups.map(group => (
            <div
              key={group.firstFrame.id}
              className="flex gap-4 rounded-xl border border-oat bg-white p-4"
            >
              {/* 首帧图 */}
              <div className="flex-shrink-0 w-24">
                {group.firstFrame.url ? (
                  <img
                    src={getImageUrl(group.firstFrame.url)}
                    alt="首帧图"
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-oat flex items-center justify-center text-sm text-warm-silver">
                    无图片
                  </div>
                )}
              </div>

              {/* 动作列表 */}
              <div className="flex-1 flex flex-wrap gap-2 content-start">
                {group.movements.map(m => {
                  const isSelected = selectedCombinations.has(m.key)
                  const isGenerated = !!m.existingVideoId

                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleSelection(m.key, m.existingVideoId)}
                      disabled={isGenerated}
                      className={cn(
                        'relative rounded-xl border-2 px-4 py-2 transition-all',
                        isGenerated
                          ? 'border-matcha-600/30 bg-matcha-50 cursor-default'
                          : isSelected
                            ? 'border-matcha-600 bg-matcha-50'
                            : 'border-oat hover:border-matcha-400'
                      )}
                    >
                      <span className="text-sm font-medium">{m.content}</span>
                      {isGenerated && (
                        <span className="ml-1 text-xs text-matcha-600">✓</span>
                      )}
                      {isSelected && !isGenerated && (
                        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-matcha-600 text-white">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="mt-6 flex items-center justify-end gap-4">
          <Button
            variant="outline"
            onClick={handleSelectAll}
            disabled={pendingCount === 0}
          >
            {selectedCombinations.size === pendingCount ? '取消全选' : '全选'}
          </Button>
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
              <>生成 ({selectedCombinations.size})</>
            )}
          </Button>
        </div>

        {/* 确认弹窗 */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm">
              <h3 className="text-lg font-semibold mb-2">确认重新生成</h3>
              <p className="text-gray-500 mb-6">
                有 {selectedCombinations.size} 个视频已生成，确定要重新生成吗？
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>
                  取消
                </Button>
                <Button onClick={doGenerate} className="bg-matcha-600 hover:bg-matcha-500">
                  确认生成
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/products/[id]/video-wizard/page.tsx
git commit -m "feat: create video wizard page"
```

---

## Task 2: 在产品详情页添加"生视频"按钮

**Files:**
- Modify: `app/(app)/products/[id]/ProductDetail.tsx`

- [ ] **Step 1: 添加"生视频"按钮**

在"生成视频"按钮后面添加：

```tsx
<button
  onClick={() => router.push(`/products/${product.id}/video-wizard`)}
  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-rose-500/30 transition-all duration-300 hover:from-rose-400 hover:to-pink-500 hover:shadow-rose-500/50 group active:scale-[0.98]"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
  生视频
</button>
```

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/products/[id]/ProductDetail.tsx
git commit -m "feat: add video wizard button to product detail page"
```

---

## 验证步骤

1. 启动开发服务器 `npm run dev`
2. 访问产品详情页 `/products/[id]`
3. 检查是否显示"生视频"按钮
4. 点击按钮进入向导页面
5. 测试筛选功能
6. 选择动作，点击生成