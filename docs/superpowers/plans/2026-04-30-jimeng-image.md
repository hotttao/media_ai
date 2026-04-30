# 即梦生图工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现即梦生图工具，用户选择人物×服装×姿势×场景组合，调用即梦接口生成首帧图

**Architecture:**
- 后端：新增 `/api/tools/combination/jimeng-images` 获取可用组合，扩展 `/api/tools/combination/generate` 支持 jimeng-image 类型
- 前端：新建 `jimeng-image/page.tsx` 页面，参考 model-image 页面布局
- 数据流：人物×服装 → 获取 modelImageId → 创建虚假 styleImageId → 调用即梦接口

**Tech Stack:** Next.js App Router, Prisma ORM, React

---

## 文件结构

```
新建:
- app/api/tools/combination/jimeng-images/route.ts   # 获取可用组合
- app/(app)/tools/jimeng-image/page.tsx              # 工具页面

修改:
- app/api/tools/combination/generate/route.ts       # 添加 jimeng-image 类型处理
- app/api/tools/route.ts                            # 可选：添加工具到列表
```

---

## Task 1: 创建 GET /api/tools/combination/jimeng-images

**Files:**
- Create: `app/api/tools/combination/jimeng-images/route.ts`

- [ ] **Step 1: 创建 jimeng-images API 路由文件**

```typescript
// app/api/tools/combination/jimeng-images/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/jimeng-images
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
      select: { id: true, nickname: true, fullBodyUrl: true },
    })

    // 获取用户的产品
    const products = await db.product.findMany({
      where: { userId },
      select: { id: true, name: true, images: { where: { isMain: true }, take: 1 } },
    })

    // 获取已生成的模特图 (modelImage)
    const modelImages = await db.modelImage.findMany({
      where: {
        ipId: { in: ips.map(ip => ip.id) },
        productId: { in: products.map(p => p.id) },
      },
      select: { id: true, ipId: true, productId: true },
    })

    const modelImageMap = new Map<string, string>() // key: "ipId-productId", value: modelImageId
    for (const mi of modelImages) {
      modelImageMap.set(`${mi.ipId}-${mi.productId}`, mi.id)
    }

    // 获取用户的姿势素材 (type: POSE)
    const poses = await db.material.findMany({
      where: {
        type: 'POSE',
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
      select: { id: true, name: true, prompt: true },
    })

    // 获取用户有权限的场景
    const scenes = await db.material.findMany({
      where: {
        type: 'SCENE',
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
      select: { id: true, name: true, url: true },
    })

    interface JimengCombination {
      id: string
      ip: { id: string; nickname: string; fullBodyUrl: string | null }
      product: { id: string; name: string; mainImageUrl: string | null }
      modelImageId: string | null  // null 表示没有模特图，不允许生成
      pose: { id: string; name: string; prompt: string | null }
      scene: { id: string; name: string; url: string | null }
      existingFirstFrameId: string | null
    }

    // 构建所有有效组合（必须有 modelImageId）
    const combinations: JimengCombination[] = []

    for (const ip of ips) {
      for (const product of products) {
        const modelImageId = modelImageMap.get(`${ip.id}-${product.id}`)
        if (!modelImageId) continue // 跳过没有模特图的组合

        for (const pose of poses) {
          for (const scene of scenes) {
            // 查找是否已存在对应的首帧图
            const existingFirstFrame = await db.firstFrame.findFirst({
              where: {
                styleImage: {
                  modelImageId: modelImageId,
                  poseId: pose.id,
                },
                sceneId: scene.id,
              },
              select: { id: true },
            })

            combinations.push({
              id: `${ip.id}-${product.id}-${pose.id}-${scene.id}`,
              ip: {
                id: ip.id,
                nickname: ip.nickname,
                fullBodyUrl: ip.fullBodyUrl,
              },
              product: {
                id: product.id,
                name: product.name,
                mainImageUrl: product.images[0]?.url || null,
              },
              modelImageId,
              pose: {
                id: pose.id,
                name: pose.name,
                prompt: pose.prompt,
              },
              scene: {
                id: scene.id,
                name: scene.name,
                url: scene.url,
              },
              existingFirstFrameId: existingFirstFrame?.id || null,
            })
          }
        }
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
git add app/api/tools/combination/jimeng-images/route.ts
git commit -m "feat: add GET /api/tools/combination/jimeng-images"
```

---

## Task 2: 扩展 POST /api/tools/combination/generate 支持 jimeng-image

**Files:**
- Modify: `app/api/tools/combination/generate/route.ts`

- [ ] **Step 1: 添加 hashStrings 函数（如果尚未存在）**

在文件顶部添加：

```typescript
function hashStrings(...inputs: (string | undefined | null)[]): string {
  const str = inputs.filter(Boolean).join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
```

- [ ] **Step 2: 在 switch 语句中添加 jimeng-image case**

在 `case 'first-frame':` 之后添加：

```typescript
case 'jimeng-image': {
  if (!modelImageId || !poseId || !sceneId) {
    return NextResponse.json({ error: 'Missing modelImageId, poseId or sceneId' }, { status: 400 })
  }

  // 1. 查找 pose 的文字描述
  const poseMaterial = await db.material.findUnique({
    where: { id: poseId },
    select: { prompt: true },
  })
  const poseText = poseMaterial?.prompt || ''

  // 2. 生成虚假 styleImageId
  const styleImageId = `jimeng_${hashStrings(modelImageId, poseId)}`

  // 3. 检查 styleImage 是否已存在，不存在则创建虚假记录
  let styleImage = await db.styleImage.findUnique({
    where: { id: styleImageId },
  })

  if (!styleImage) {
    styleImage = await db.styleImage.create({
      data: {
        id: styleImageId,
        productId: '',  // 即梦不关心这些字段
        ipId: '',
        modelImageId: modelImageId,
        url: '',        // 虚假记录，无实际图片
        poseId: poseId,
        poseText: poseText,
        inputHash: hashStrings(modelImageId, poseId),
      },
    })
  }

  // 4. 调用即梦接口
  console.log('\n========== JIMENG-IMAGE REQUEST ==========')
  console.log('URL: http://127.0.0.1:8765/v1/single/jimeng-image')
  console.log('BODY:', JSON.stringify({ styleImageId, sceneId, poseId, force: false }, null, 2))
  console.log('==========================================\n')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  let response
  try {
    response = await fetch('http://127.0.0.1:8765/v1/single/jimeng-image', {
      method: 'POST',
      headers: { 'Content-Type: 'application/json' },
      body: JSON.stringify({ styleImageId, sceneId, poseId, force: false }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('>>> Jimeng-image API call failed:', err)
    return NextResponse.json({ error: 'Failed to submit task: network error' }, { status: 500 })
  }

  clearTimeout(timeoutId)
  console.log('>>> Jimeng-image API response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('Jimeng-image API returned error:', response.status, errorText)
    return NextResponse.json({ error: 'Failed to submit task' }, { status: 500 })
  }

  return NextResponse.json({ status: 'submitted' })
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/api/tools/combination/generate/route.ts
git commit -m "feat: add jimeng-image support in combination generate API"
```

---

## Task 3: 创建即梦生图页面

**Files:**
- Create: `app/(app)/tools/jimeng-image/page.tsx`

- [ ] **Step 1: 创建页面组件**

参考 `model-image/page.tsx` 的布局和 `first-frame/page.tsx` 的组合处理方式：

```tsx
'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { GeneratedCombination } from '@/components/video-generation/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface JimengCombination {
  id: string
  ip: { id: string; nickname: string; fullBodyUrl: string | null }
  product: { id: string; name: string; mainImageUrl: string | null }
  modelImageId: string
  pose: { id: string; name: string; prompt: string | null }
  scene: { id: string; name: string; url: string | null }
  existingFirstFrameId: string | null
}

export default function JimengImagePage() {
  const [loading, setLoading] = useState(true)
  const [combinations, setCombinations] = useState<JimengCombination[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [selectedPoseIds, setSelectedPoseIds] = useState<Set<string>>(new Set())
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/jimeng-images')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: JimengCombination[]) => {
        setCombinations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // IP 去重
  const ips = Array.from(
    new Map(combinations.map(c => [c.ip.id, c.ip])).values()
  )

  // 根据选择的 IP 过滤可用的产品
  const availableProducts = selectedIpId
    ? Array.from(
        new Map(
          combinations
            .filter(c => c.ip.id === selectedIpId && c.modelImageId)
            .map(c => [c.product.id, c.product])
        ).values()
      )
    : []

  // 根据选择的 IP 和产品过滤可用的姿势
  const availablePoses = selectedIpId && selectedProductIds.size > 0
    ? Array.from(
        new Map(
          combinations
            .filter(c => c.ip.id === selectedIpId && selectedProductIds.has(c.product.id) && c.modelImageId)
            .map(c => [c.pose.id, c.pose])
        ).values()
      )
    : []

  // 根据选择的 IP、产品、姿势过滤可用的场景
  const availableScenes = selectedIpId && selectedProductIds.size > 0 && selectedPoseIds.size > 0
    ? Array.from(
        new Map(
          combinations
            .filter(
              c =>
                c.ip.id === selectedIpId &&
                selectedProductIds.has(c.product.id) &&
                selectedPoseIds.has(c.pose.id) &&
                c.modelImageId
            )
            .map(c => [c.scene.id, c.scene])
        ).values()
      )
    : []

  // 构建待生成组合
  const pendingCombinations: GeneratedCombination[] = []
  if (selectedIpId) {
    for (const productId of selectedProductIds) {
      for (const poseId of selectedPoseIds) {
        for (const sceneId of selectedSceneIds) {
          const combo = combinations.find(
            c =>
              c.ip.id === selectedIpId &&
              c.product.id === productId &&
              c.pose.id === poseId &&
              c.scene.id === sceneId
          )
          if (combo) {
            const key = `${productId}|${poseId}|${sceneId}`
            pendingCombinations.push({
              id: key,
              key,
              itemA: { id: productId, name: combo.product.name, url: combo.product.mainImageUrl || undefined },
              itemB: { id: poseId, name: combo.pose.name },
              itemC: { id: sceneId, name: combo.scene.name, url: combo.scene.url || undefined },
              status: combo.existingFirstFrameId ? 'generated' : 'pending',
            })
          }
        }
      }
    }
  }

  const pendingCount = pendingCombinations.filter(c => c.status === 'pending').length

  const handleProductToggle = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handlePoseToggle = (id: string) => {
    setSelectedPoseIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSceneToggle = (id: string) => {
    setSelectedSceneIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleGenerate = async () => {
    if (pendingCount === 0) return

    setGenerating(true)
    try {
      const combosToGenerate = pendingCombinations.filter(c => c.status === 'pending')
      for (const combo of combosToGenerate) {
        const [productId, poseId, sceneId] = combo.key.split('|')
        const comboData = combinations.find(
          c =>
            c.ip.id === selectedIpId &&
            c.product.id === productId &&
            c.pose.id === poseId &&
            c.scene.id === sceneId
        )
        if (!comboData) continue

        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'jimeng-image',
            modelImageId: comboData.modelImageId,
            poseId,
            sceneId,
          }),
        })
      }
      alert('已提交生成任务')
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
      <CombinationToolPage title="即梦生图" description="选择人物、服装、姿势、场景生成首帧图" icon="✨">
        <div className="flex items-center justify-center rounded-xl border border-oat bg-white px-6 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-matcha-600 border-t-transparent"></div>
          <span className="ml-3 text-sm text-warm-silver">加载中...</span>
        </div>
      </CombinationToolPage>
    )
  }

  return (
    <CombinationToolPage title="即梦生图" description="选择人物、服装、姿势、场景生成首帧图" icon="✨">
      <div className="space-y-8">
        {/* IP 选择 - 单选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择人物</h3>
          </div>
          <div className="p-4">
            {ips.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用人物</p>
            ) : (
              <div className="flex gap-3">
                {ips.map(ip => (
                  <button
                    key={ip.id}
                    onClick={() => {
                      setSelectedIpId(ip.id)
                      setSelectedProductIds(new Set())
                      setSelectedPoseIds(new Set())
                      setSelectedSceneIds(new Set())
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
                      selectedIpId === ip.id
                        ? 'border-matcha-600 bg-matcha-50'
                        : 'border-oat hover:border-matcha-600'
                    )}
                  >
                    {ip.fullBodyUrl ? (
                      <img src={getImageUrl(ip.fullBodyUrl)} alt={ip.nickname} className="h-20 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-oat text-sm text-warm-silver">无图片</div>
                    )}
                    <span className="text-sm font-medium">{ip.nickname}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 服装选择 - 多选 */}
        {selectedIpId && (
          <div className="rounded-xl border border-oat bg-white shadow-clay">
            <div className="flex items-center justify-between border-b border-oat px-4 py-3">
              <h3 className="text-sm font-semibold">选择服装</h3>
              <div className="flex gap-2 text-xs text-warm-silver">
                <button onClick={() => setSelectedProductIds(new Set(availableProducts.map(p => p.id)))} className="hover:text-foreground">全选</button>
                <span>|</span>
                <button onClick={() => setSelectedProductIds(new Set())} className="hover:text-foreground">清空</button>
              </div>
            </div>
            <div className="p-4">
              {availableProducts.length === 0 ? (
                <p className="text-sm text-warm-silver">暂无可用服装</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleProductToggle(product.id)}
                      className={cn(
                        'relative rounded-xl border-2 transition-all',
                        selectedProductIds.has(product.id)
                          ? 'border-matcha-600'
                          : 'border-transparent hover:border-matcha-400'
                      )}
                    >
                      {product.mainImageUrl ? (
                        <img src={getImageUrl(product.mainImageUrl)} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-oat text-xs text-warm-silver">无图片</div>
                      )}
                      {selectedProductIds.has(product.id) && (
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
              <p className="text-xs text-warm-silver">已选择 {selectedProductIds.size} / {availableProducts.length}</p>
            </div>
          </div>
        )}

        {/* 姿势选择 - 多选 */}
        {selectedProductIds.size > 0 && (
          <div className="rounded-xl border border-oat bg-white shadow-clay">
            <div className="flex items-center justify-between border-b border-oat px-4 py-3">
              <h3 className="text-sm font-semibold">选择姿势</h3>
              <div className="flex gap-2 text-xs text-warm-silver">
                <button onClick={() => setSelectedPoseIds(new Set(availablePoses.map(p => p.id)))} className="hover:text-foreground">全选</button>
                <span>|</span>
                <button onClick={() => setSelectedPoseIds(new Set())} className="hover:text-foreground">清空</button>
              </div>
            </div>
            <div className="p-4">
              {availablePoses.length === 0 ? (
                <p className="text-sm text-warm-silver">暂无可用姿势</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availablePoses.map(pose => (
                    <button
                      key={pose.id}
                      onClick={() => handlePoseToggle(pose.id)}
                      className={cn(
                        'relative rounded-xl border-2 px-4 py-2 transition-all',
                        selectedPoseIds.has(pose.id)
                          ? 'border-matcha-600 bg-matcha-50'
                          : 'border-oat hover:border-matcha-400'
                      )}
                    >
                      <span className="text-sm font-medium">{pose.name}</span>
                      {selectedPoseIds.has(pose.id) && (
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
              <p className="text-xs text-warm-silver">已选择 {selectedPoseIds.size} / {availablePoses.length}</p>
            </div>
          </div>
        )}

        {/* 场景选择 - 多选 */}
        {selectedPoseIds.size > 0 && (
          <div className="rounded-xl border border-oat bg-white shadow-clay">
            <div className="flex items-center justify-between border-b border-oat px-4 py-3">
              <h3 className="text-sm font-semibold">选择场景</h3>
              <div className="flex gap-2 text-xs text-warm-silver">
                <button onClick={() => setSelectedSceneIds(new Set(availableScenes.map(s => s.id)))} className="hover:text-foreground">全选</button>
                <span>|</span>
                <button onClick={() => setSelectedSceneIds(new Set())} className="hover:text-foreground">清空</button>
              </div>
            </div>
            <div className="p-4">
              {availableScenes.length === 0 ? (
                <p className="text-sm text-warm-silver">暂无可用场景</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableScenes.map(scene => (
                    <button
                      key={scene.id}
                      onClick={() => handleSceneToggle(scene.id)}
                      className={cn(
                        'relative rounded-xl border-2 transition-all',
                        selectedSceneIds.has(scene.id)
                          ? 'border-matcha-600'
                          : 'border-transparent hover:border-matcha-400'
                      )}
                    >
                      {scene.url ? (
                        <img src={getImageUrl(scene.url)} alt={scene.name} className="h-16 w-16 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-oat text-xs text-warm-silver">无图片</div>
                      )}
                      {selectedSceneIds.has(scene.id) && (
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
              <p className="text-xs text-warm-silver">已选择 {selectedSceneIds.size} / {availableScenes.length}</p>
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
                      combo.status === 'pending' && 'border-oat bg-white',
                      combo.status === 'generated' && 'border-matcha-600/30 bg-matcha-50'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span>{combo.itemA?.name}</span>
                      <span className="text-warm-silver">×</span>
                      <span>{combo.itemB?.name}</span>
                      <span className="text-warm-silver">×</span>
                      <span>{combo.itemC?.name}</span>
                    </div>
                    {combo.status === 'generated' && (
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
git add app/(app)/tools/jimeng-image/page.tsx
git commit -m "feat: add jimeng-image tool page"
```

---

## Task 4: 可选 - 添加到工具列表

**Files:**
- Modify: `app/api/tools/route.ts`

如果你希望即梦生图出现在首页工具列表中，添加如下条目：

```typescript
{
  id: 'jimeng-image',
  name: '即梦生图',
  description: '选择人物、服装、姿势、场景生成首帧图',
  icon: '✨',
  gradient: 'from-yellow-400 to-orange-500',
  href: '/tools/jimeng-image',
},
```

---

## 验证步骤

1. 启动开发服务器 `npm run dev`
2. 访问 `/tools/jimeng-image`
3. 选择人物，应该显示对应的服装
4. 选择服装后，应该显示对应的姿势
5. 选择姿势后，应该显示对应的场景
6. 点击生成，检查控制台输出和数据库记录

---

## 注意事项

1. **组合数量控制**：4个参数的全组合可能很大，考虑在 API 层面添加限制
2. **虚假 styleImage 记录**：`jimeng_` 前缀用于标识这是即梦生成的虚假记录
3. **错误处理**：即梦接口调用失败时，不删除已创建的虚假 styleImage 记录
