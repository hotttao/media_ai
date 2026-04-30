# 即梦生视频工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现即梦生视频工具，用户选择首帧图×动作组合，调用即梦接口生成视频

**Architecture:**
- 后端：新增 `/api/tools/combination/jimeng-videos` 获取可用组合，扩展 `/api/tools/combination/generate` 支持 jimeng-video 类型
- 前端：新建 `jimeng-video/page.tsx` 页面，两步级联选择（首帧图 → 动作）
- 动作过滤：根据首帧图的 styleImage.poseId 过滤可用动作

**Tech Stack:** Next.js App Router, Prisma ORM, React

---

## 文件结构

```
新建:
- app/api/tools/combination/jimeng-videos/route.ts   # 获取可用组合
- app/(app)/tools/jimeng-video/page.tsx              # 工具页面

修改:
- app/api/tools/combination/generate/route.ts       # 添加 jimeng-video 类型处理
- app/api/tools/route.ts                            # 添加工具到列表
```

---

## Task 1: 创建 GET /api/tools/combination/jimeng-videos

**Files:**
- Create: `app/api/tools/combination/jimeng-videos/route.ts`

- [ ] **Step 1: 创建 API 路由文件**

参考 `jimeng-images/route.ts` 的模式：

```typescript
// app/api/tools/combination/jimeng-videos/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/jimeng-videos
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 获取用户 IP
    const ips = await db.virtualIp.findMany({
      where: { userId },
      select: { id: true },
    })
    const ipIds = ips.map(ip => ip.id)

    // 获取用户的所有首帧图（包含 styleImage.poseId）
    const firstFrames = await db.firstFrame.findMany({
      where: { ipId: { in: ipIds } },
      include: {
        styleImage: {
          select: {
            id: true,
            poseId: true,
          },
        },
      },
    })

    // 获取所有已生成的视频（用于过滤）
    const existingVideos = await db.video.findMany({
      where: {
        firstFrameId: { not: '' },
        ipId: { in: ipIds },
      },
      select: {
        id: true,
        firstFrameId: true,
        movementId: true,
      },
    })

    // 构建 existingVideoMap: key = "firstFrameId|movementId", value = videoId
    const existingVideoMap = new Map<string, string>()
    for (const v of existingVideos) {
      if (v.firstFrameId && v.movementId) {
        existingVideoMap.set(`${v.firstFrameId}-${v.movementId}`, v.id)
      }
    }

    // 获取所有可用的动作
    const movements = await db.movementMaterial.findMany({
      select: {
        id: true,
        content: true,
        isGeneral: true,
        poseLinks: {
          select: {
            poseId: true,
          },
        },
      },
    })

    // 构建动作列表（带 poseIds）
    const movementList = movements.map(m => ({
      id: m.id,
      content: m.content,
      isGeneral: m.isGeneral,
      poseIds: m.poseLinks.map(p => p.poseId),
    }))

    // 构建组合
    interface JimengVideoCombination {
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

    const combinations: JimengVideoCombination[] = []

    for (const ff of firstFrames) {
      const poseId = ff.styleImage?.poseId

      // 根据 poseId 过滤可用动作
      const allowedMovements = poseId
        ? movementList.filter(m => m.isGeneral || m.poseIds.includes(poseId))
        : movementList

      for (const mov of allowedMovements) {
        const key = `${ff.id}-${mov.id}`
        const existingVideoId = existingVideoMap.get(key) || null

        combinations.push({
          id: key,
          firstFrame: {
            id: ff.id,
            url: ff.url,
            poseId: poseId || '',
          },
          movement: {
            id: mov.id,
            content: mov.content,
          },
          existingVideoId,
        })
      }
    }

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/api/tools/combination/jimeng-videos/route.ts
git commit -m "feat: add GET /api/tools/combination/jimeng-videos"
```

---

## Task 2: 扩展 POST /api/tools/combination/generate 支持 jimeng-video

**Files:**
- Modify: `app/api/tools/combination/generate/route.ts`

- [ ] **Step 1: 在 switch 语句中添加 jimeng-video case**

在 `case 'jimeng-image':` 之后添加：

```typescript
case 'jimeng-video': {
  if (!firstFrameId || !movementId) {
    return NextResponse.json({ error: 'Missing firstFrameId or movementId' }, { status: 400 })
  }

  // 1. 获取首帧图信息（包含 productId, ipId）
  const firstFrame = await db.firstFrame.findUnique({
    where: { id: firstFrameId },
    select: { id: true, productId: true, ipId: true },
  })

  if (!firstFrame) {
    return NextResponse.json({ error: 'FirstFrame not found' }, { status: 404 })
  }

  // 2. 获取动作信息（获取 content 作为 prompt）
  const movement = await db.movementMaterial.findUnique({
    where: { id: movementId },
    select: { id: true, content: true },
  })

  if (!movement) {
    return NextResponse.json({ error: 'Movement not found' }, { status: 404 })
  }

  // 3. 调用即梦接口
  console.log('\n========== JIMENG-VIDEO REQUEST ==========')
  console.log('URL: http://127.0.0.1:8765/v1/single/jimeng-video')
  console.log('BODY:', JSON.stringify({
    productId: firstFrame.productId,
    ipId: firstFrame.ipId,
    firstFrameId,
    movementId,
    prompt: movement.content,
    force: false,
  }, null, 2))
  console.log('==========================================\n')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  let response
  try {
    response = await fetch('http://127.0.0.1:8765/v1/single/jimeng-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: firstFrame.productId,
        ipId: firstFrame.ipId,
        firstFrameId,
        movementId,
        prompt: movement.content,
        force: false,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('>>> Jimeng-video API call failed:', err)
    return NextResponse.json({ error: 'Failed to submit task: network error' }, { status: 500 })
  }

  clearTimeout(timeoutId)
  console.log('>>> Jimeng-video API response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('Jimeng-video API returned error:', response.status, errorText)
    return NextResponse.json({ error: 'Failed to submit task' }, { status: 500 })
  }

  return NextResponse.json({ status: 'submitted' })
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/api/tools/combination/generate/route.ts
git commit -m "feat: add jimeng-video support in combination generate API"
```

---

## Task 3: 创建即梦生视频页面

**Files:**
- Create: `app/(app)/tools/jimeng-video/page.tsx`

- [ ] **Step 1: 创建页面组件**

参考 `jimeng-image/page.tsx` 的布局（更简单，只有两步）：

```tsx
'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface JimengVideoCombination {
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

  // 首帧图去重
  const firstFrames = Array.from(
    new Map(combinations.map(c => [c.firstFrame.id, c.firstFrame])).values()
  )

  // 根据选中的首帧图过滤可用动作
  const availableMovements = selectedFirstFrameIds.size > 0
    ? Array.from(
        new Map(
          combinations
            .filter(c => selectedFirstFrameIds.has(c.firstFrame.id))
            .map(c => [c.movement.id, c.movement])
        ).values()
      )
    : []

  // 构建待生成组合
  const pendingCombinations: JimengVideoCombination[] = []
  for (const ffId of selectedFirstFrameIds) {
    for (const movId of selectedMovementIds) {
      const combo = combinations.find(
        c => c.firstFrame.id === ffId && c.movement.id === movId
      )
      if (combo) {
        pendingCombinations.push(combo)
      }
    }
  }

  const pendingCount = pendingCombinations.filter(c => !c.existingVideoId).length

  const handleFirstFrameToggle = (id: string) => {
    setSelectedFirstFrameIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      // 清除已选的动作（因为动作列表变了）
      setSelectedMovementIds(new Set())
      return next
    })
  }

  const handleMovementToggle = (id: string) => {
    setSelectedMovementIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleGenerate = async () => {
    if (pendingCount === 0) return

    setGenerating(true)
    try {
      const results: { success: boolean; firstFrameId: string; movementId: string }[] = []

      for (const combo of pendingCombinations) {
        if (combo.existingVideoId) continue

        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'jimeng-video',
            firstFrameId: combo.firstFrame.id,
            movementId: combo.movement.id,
          }),
        })

        results.push({
          success: res.ok,
          firstFrameId: combo.firstFrame.id,
          movementId: combo.movement.id,
        })
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
      <CombinationToolPage title="即梦生视频" description="选择首帧图和动作，生成视频" icon="🎬">
        <div className="flex items-center justify-center rounded-xl border border-oat bg-white px-6 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-matcha-600 border-t-transparent"></div>
          <span className="ml-3 text-sm text-warm-silver">加载中...</span>
        </div>
      </CombinationToolPage>
    )
  }

  return (
    <CombinationToolPage title="即梦生视频" description="选择首帧图和动作，生成视频" icon="🎬">
      <div className="space-y-8">
        {/* 首帧图选择 - 多选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择首帧图</h3>
            <div className="flex gap-2 text-xs text-warm-silver">
              <button
                onClick={() => setSelectedFirstFrameIds(new Set(firstFrames.map(ff => ff.id)))}
                className="hover:text-foreground"
              >
                全选
              </button>
              <span>|</span>
              <button
                onClick={() => {
                  setSelectedFirstFrameIds(new Set())
                  setSelectedMovementIds(new Set())
                }}
                className="hover:text-foreground"
              >
                清空
              </button>
            </div>
          </div>
          <div className="p-4">
            {firstFrames.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用首帧图</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {firstFrames.map(ff => (
                  <button
                    key={ff.id}
                    onClick={() => handleFirstFrameToggle(ff.id)}
                    className={cn(
                      'relative rounded-xl border-2 transition-all',
                      selectedFirstFrameIds.has(ff.id)
                        ? 'border-matcha-600'
                        : 'border-transparent hover:border-matcha-400'
                    )}
                  >
                    {ff.url ? (
                      <img src={getImageUrl(ff.url)} alt="首帧图" className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-oat text-xs text-warm-silver">无图片</div>
                    )}
                    {selectedFirstFrameIds.has(ff.id) && (
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
            <p className="text-xs text-warm-silver">已选择 {selectedFirstFrameIds.size} / {firstFrames.length}</p>
          </div>
        </div>

        {/* 动作选择 - 多选 */}
        {selectedFirstFrameIds.size > 0 && (
          <div className="rounded-xl border border-oat bg-white shadow-clay">
            <div className="flex items-center justify-between border-b border-oat px-4 py-3">
              <h3 className="text-sm font-semibold">选择动作</h3>
              <div className="flex gap-2 text-xs text-warm-silver">
                <button
                  onClick={() => setSelectedMovementIds(new Set(availableMovements.map(m => m.id)))}
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
            </div>
            <div className="p-4">
              {availableMovements.length === 0 ? (
                <p className="text-sm text-warm-silver">暂无可用动作</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableMovements.map(mov => (
                    <button
                      key={mov.id}
                      onClick={() => handleMovementToggle(mov.id)}
                      className={cn(
                        'relative rounded-xl border-2 px-4 py-2 transition-all',
                        selectedMovementIds.has(mov.id)
                          ? 'border-matcha-600 bg-matcha-50'
                          : 'border-oat hover:border-matcha-400'
                      )}
                    >
                      <span className="text-sm font-medium">{mov.content}</span>
                      {selectedMovementIds.has(mov.id) && (
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
              <p className="text-xs text-warm-silver">已选择 {selectedMovementIds.size} / {availableMovements.length}</p>
            </div>
          </div>
        )}

        {/* 组合预览 */}
        {pendingCombinations.length > 0 && (
          <div className="rounded-xl border border-oat bg-white shadow-clay">
            <div className="flex items-center justify-between border-b border-oat px-4 py-3">
              <h3 className="text-sm font-semibold">生成的组合</h3>
              <span className="text-xs text-warm-silver">
                待生成 <span className="font-medium text-foreground">{pendingCount}</span>
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto p-4">
              <div className="space-y-2">
                {pendingCombinations.map(combo => (
                  <div
                    key={combo.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2',
                      combo.existingVideoId ? 'border-matcha-600/30 bg-matcha-50' : 'border-oat bg-white'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span>首帧图 {combo.firstFrame.id.slice(0, 8)}</span>
                      <span className="text-warm-silver">×</span>
                      <span>{combo.movement.content}</span>
                    </div>
                    {combo.existingVideoId && (
                      <Badge variant="success" className="text-xs">已存在 ✓</Badge>
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
            disabled={pendingCount === 0 || generating}
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
```

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/tools/jimeng-video/page.tsx
git commit -m "feat: add jimeng-video tool page"
```

---

## Task 4: 添加工具到列表

**Files:**
- Modify: `app/api/tools/route.ts`

- [ ] **Step 1: 添加 jimeng-video 工具条目**

在工具列表中添加：

```typescript
{
  id: 'jimeng-video',
  name: '即梦生视频',
  description: '选择首帧图和动作，生成视频',
  icon: '🎬',
  gradient: 'from-rose-400 to-pink-500',
  href: '/tools/jimeng-video',
},
```

- [ ] **Step 2: 提交代码**

```bash
git add app/api/tools/route.ts
git commit -m "feat: add jimeng-video tool to tools list"
```

---

## 验证步骤

1. 启动开发服务器 `npm run dev`
2. 访问 `/tools/jimeng-video`
3. 选择首帧图，检查动作列表是否根据姿势过滤
4. 选择动作后，预览组合是否正确
5. 点击生成，检查控制台输出
