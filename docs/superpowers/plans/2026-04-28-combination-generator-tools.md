# 组合生成工具开发计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现三个组合生成工具页面：模特图生成、定妆图生成、首帧图生成。每个工具支持选择两个维度的选项，生成两两组合，并过滤已生成的组合。

**Architecture:**
- 新建 `app/(app)/tools/model-image/page.tsx` 等三个页面
- 新建 `app/api/tools/combination/model-images/route.ts` 等 API 路由获取可选项
- 复用已创建的 `components/video-generation/CombinationSelector.tsx`
- 服务层复用 `domains/video-generation/service.ts` 现有方法
- 外部工具 API 调用 `http://127.0.0.1:8765/v1/single/*`

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, shadcn/ui, React Query

---

## 文件结构

```
app/(app)/tools/
├── model-image/page.tsx                    # 模特图生成页
├── style-image/page.tsx                   # 定妆图生成页
└── first-frame/page.tsx                   # 首帧图生成页

app/api/tools/combination/
├── model-images/route.ts                  # 获取可生成模特图的 IP×产品组合
├── style-images/route.ts                  # 获取可生成定妆图的姿势×模特图组合
├── first-frames/route.ts                   # 获取可生成首帧图的场景×定妆图组合
└── generate/route.ts                      # 通用生成接口

components/video-generation/
├── CombinationSelector.tsx                # 已创建，需增强功能
└── CombinationToolPage.tsx               # 新建：通用工具页面布局

domains/video-generation/
├── service.ts                            # 已有方法
└── service.test.ts                       # 新增：批量生成测试

jest.config.js                            # Jest 配置（如果不存在）
```

---

## Task 1: 完善 CombinationSelector 组件

**Files:**
- Modify: `components/video-generation/CombinationSelector.tsx`
- Create: `components/video-generation/CombinationToolPage.tsx`
- Create: `components/video-generation/__tests__/CombinationSelector.test.tsx`

- [ ] **Step 1: 阅读现有 CombinationSelector 实现**

```bash
cat components/video-generation/CombinationSelector.tsx
```

- [ ] **Step 2: 更新 types.ts 添加 FilterOptions 类型**

```typescript
// components/video-generation/types.ts
export interface FilterOptions {
  /** 排除已存在的组合ID列表 */
  excludeIds?: string[]
  /** 只返回未过期的项 */
  onlyAvailable?: boolean
}
```

- [ ] **Step 3: 增强 CombinationSelector 接受外部组合状态**

在 `CombinationSelector` 中添加：
- `initialCombinations?: GeneratedCombination[]` - 外部传入的组合列表
- `onCombinationStatusChange?: (id: string, status: CombinationStatus) => void` - 状态变化回调
- `generatingIds?: string[]` - 正在生成的组合ID列表

- [ ] **Step 4: 创建通用工具页面布局组件**

```tsx
// components/video-generation/CombinationToolPage.tsx
interface CombinationToolPageProps {
  title: string
  description: string
  icon: string
  children: React.ReactNode
}

export function CombinationToolPage({ title, description, icon, children }: CombinationToolPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-warm-charcoal tracking-tight">{title}</h1>
            <p className="text-warm-silver mt-1">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 编写 CombinationSelector 单元测试**

```tsx
// components/video-generation/__tests__/CombinationSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { CombinationSelector } from '../CombinationSelector'

const mockPoses = [
  { id: 'pose-1', name: '站立姿势', url: 'https://example.com/pose1.jpg' },
  { id: 'pose-2', name: '行走姿势', url: 'https://example.com/pose2.jpg' },
]

const mockModels = [
  { id: 'model-1', name: '模特图-A', url: 'https://example.com/model1.jpg' },
  { id: 'model-2', name: '模特图-B', url: 'https://example.com/model2.jpg' },
]

describe('CombinationSelector', () => {
  it('renders both selection panels', () => {
    render(<CombinationSelector type="style-image" itemsA={mockPoses} itemsB={mockModels} />)
    expect(screen.getByText('姿势选择')).toBeInTheDocument()
    expect(screen.getByText('模特图选择')).toBeInTheDocument()
  })

  it('shows correct combination count when items are selected', async () => {
    render(<CombinationSelector type="style-image" itemsA={mockPoses} itemsB={mockModels} />)
    fireEvent.click(screen.getByText('站立姿势'))
    fireEvent.click(screen.getByText('模特图-A'))
    expect(screen.getByText('共 1 个组合')).toBeInTheDocument()
  })

  it('filters existing combinations', () => {
    render(
      <CombinationSelector
        type="style-image"
        itemsA={mockPoses}
        itemsB={mockModels}
        existingIds={['pose-1-model-1']}
      />
    )
    fireEvent.click(screen.getByText('站立姿势'))
    fireEvent.click(screen.getByText('模特图-A'))
    expect(screen.getByText('已存在 ✓')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: 运行测试验证**

```bash
yarn test components/video-generation/__tests__/CombinationSelector.test.tsx
```

Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add components/video-generation/
git commit -m "feat: enhance CombinationSelector component with batch generation support"
```

---

## Task 2: 模特图生成页面

**Files:**
- Create: `app/(app)/tools/model-image/page.tsx`
- Create: `app/api/tools/combination/model-images/route.ts`
- Create: `domains/video-generation/__tests__/batch-generate.test.ts`

- [ ] **Step 1: 创建模特图生成页面**

```tsx
// app/(app)/tools/model-image/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { SelectableItem, GeneratedCombination } from '@/components/video-generation/types'

interface ModelImageOption {
  id: string
  name: string
  url?: string
  ipId: string
  productId: string
}

interface AvailableCombination {
  id: string
  ip: { id: string; nickname: string; fullBodyUrl?: string }
  product: { id: string; name: string; mainImageUrl?: string }
}

export default function ModelImagePage() {
  const [loading, setLoading] = useState(true)
  const [availableCombinations, setAvailableCombinations] = useState<AvailableCombination[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/model-images')
      .then(res => res.json())
      .then(data => {
        setAvailableCombinations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // 转换为 SelectableItem 格式
  const ips = availableCombinations.map(c => ({
    id: c.ip.id,
    name: c.ip.nickname,
    url: c.ip.fullBodyUrl,
  }))

  const products = availableCombinations.map(c => ({
    id: c.product.id,
    name: c.product.name,
    url: c.product.mainImageUrl,
  }))

  // 已生成的组合ID
  const existingIds = availableCombinations
    .filter(c => c.existingModelImageId)
    .map(c => `${c.ip.id}-${c.product.id}`)

  const handleGenerate = async (combinations: GeneratedCombination[]) => {
    setGenerating(true)
    try {
      for (const combo of combinations) {
        const [ipId, productId] = combo.key.split('-')
        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'model-image', ipId, productId }),
        })
      }
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <CombinationToolPage
      title="模特图生成"
      description="选择虚拟IP和产品，生成模特图"
      icon="👗"
    >
      <CombinationSelector
        type="model-image"
        itemsA={ips}
        itemsB={products}
        existingIds={existingIds}
        loading={loading}
        generating={generating}
        onGenerate={handleGenerate}
      />
    </CombinationToolPage>
  )
}
```

- [ ] **Step 2: 创建获取可用组合的 API**

```typescript
// app/api/tools/combination/model-images/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/model-images
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // 获取用户的所有 IP
  const ips = await db.virtualIp.findMany({
    where: { userId },
    select: { id: true, nickname: true, fullBodyUrl: true },
  })

  // 获取用户的所有产品
  const products = await db.product.findMany({
    where: { userId },
    select: { id: true, name: true, images: { where: { isMain: true }, take: 1 } },
  })

  // 获取已生成的模特图
  const existingModelImages = await db.modelImage.findMany({
    where: {
      ipId: { in: ips.map(ip => ip.id) },
      productId: { in: products.map(p => p.id) },
    },
    select: { id: true, ipId: true, productId: true },
  })

  const existingSet = new Set(existingModelImages.map(m => `${m.ipId}-${m.productId}`))

  // 构建可用组合（排除已生成的）
  const combinations = ips.flatMap(ip =>
    products
      .filter(p => !existingSet.has(`${ip.id}-${p.id}`))
      .map(product => ({
        id: `${ip.id}-${product.id}`,
        ip,
        product: {
          id: product.id,
          name: product.name,
          mainImageUrl: product.images[0]?.url,
        },
        existingModelImageId: null,
      }))
  )

  return NextResponse.json(combinations)
}
```

- [ ] **Step 3: 创建通用生成 API**

```typescript
// app/api/tools/combination/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateModelImage, generateStyleImage, generateFirstFrame } from '@/domains/video-generation/service'
import { db } from '@/foundation/lib/db'

// POST /api/tools/combination/generate
export async function POST(
  request: NextRequest,
  { params }: { params: { type: 'model-image' | 'style-image' | 'first-frame' } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, ipId, productId, modelImageId, poseId, styleImageId, sceneId } = body

  try {
    let result

    switch (type) {
      case 'model-image': {
        const product = await db.product.findUnique({
          where: { id: productId },
          include: { images: { where: { isMain: true }, take: 1 } },
        })
        if (!product?.images[0]) {
          return NextResponse.json({ error: 'Product has no main image' }, { status: 400 })
        }
        result = await generateModelImage(
          productId,
          ipId,
          product.images[0].url,
          []
        )
        break
      }

      case 'style-image': {
        result = await generateStyleImage(modelImageId, poseId)
        break
      }

      case 'first-frame': {
        const modelImage = await db.styleImage.findUnique({
          where: { id: styleImageId },
          include: { modelImage: true },
        })
        if (!modelImage) {
          return NextResponse.json({ error: 'Style image not found' }, { status: 404 })
        }
        result = await generateFirstFrame(
          productId,
          ipId,
          styleImageId,
          sceneId,
          '',
          modelImage.url
        )
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 更新 tools API 添加链接**

```typescript
// app/api/tools/route.ts - 添加 href
{
  id: ModelImageTool.id,
  name: '模特图生成',
  description: '结合虚拟IP全身图和产品图生成模特图',
  icon: '👗',
  gradient: 'from-violet-400 to-purple-500',
  href: '/tools/model-image',  // 修改这行
  inputs: ModelImageTool.inputs,
  outputs: ModelImageTool.outputs,
},
```

- [ ] **Step 5: 提交**

```bash
git add app/\(app\)/tools/model-image/ app/api/tools/combination/ domains/video-generation/service.ts
git commit -m "feat: add model image generation tool page"
```

---

## Task 3: 定妆图生成页面

**Files:**
- Create: `app/(app)/tools/style-image/page.tsx`
- Create: `app/api/tools/combination/style-images/route.ts`

- [ ] **Step 1: 创建定妆图生成页面**

```tsx
// app/(app)/tools/style-image/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { SelectableItem, GeneratedCombination } from '@/components/video-generation/types'

export default function StyleImagePage() {
  const [loading, setLoading] = useState(true)
  const [availableCombinations, setAvailableCombinations] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/style-images')
      .then(res => res.json())
      .then(data => {
        setAvailableCombinations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const poses = availableCombinations.map((c: any) => ({
    id: c.pose.id,
    name: c.pose.name,
    url: c.pose.url,
  }))

  const modelImages = availableCombinations.map((c: any) => ({
    id: c.modelImage.id,
    name: `模特图 ${c.modelImage.id.slice(0, 8)}`,
    url: c.modelImage.url,
  }))

  const existingIds = availableCombinations
    .filter((c: any) => c.existingStyleImageId)
    .map((c: any) => `${c.pose.id}-${c.modelImage.id}`)

  const handleGenerate = async (combinations: GeneratedCombination[]) => {
    setGenerating(true)
    try {
      for (const combo of combinations) {
        const [poseId, modelImageId] = combo.key.split('-')
        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'style-image', modelImageId, poseId }),
        })
      }
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <CombinationToolPage
      title="定妆图生成"
      description="选择姿势和模特图，生成定妆图"
      icon="💄"
    >
      <CombinationSelector
        type="style-image"
        itemsA={poses}
        itemsB={modelImages}
        existingIds={existingIds}
        loading={loading}
        generating={generating}
        onGenerate={handleGenerate}
      />
    </CombinationToolPage>
  )
}
```

- [ ] **Step 2: 创建获取可用定妆图组合 API**

```typescript
// app/api/tools/combination/style-images/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/style-images
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // 获取用户的 IP
  const ips = await db.virtualIp.findMany({
    where: { userId },
    select: { id: true },
  })
  const ipIds = ips.map(ip => ip.id)

  // 获取这些 IP 的所有模特图
  const modelImages = await db.modelImage.findMany({
    where: { ipId: { in: ipIds } },
    include: {
      product: { select: { id: true, name: true } },
      styleImages: { select: { id: true, inputHash: true, poseId: true } },
    },
  })

  // 获取所有可用姿势
  const poses = await db.material.findMany({
    where: { type: 'POSE', OR: [{ userId }, { visibility: 'public' }] },
    select: { id: true, name: true, url: true },
  })

  // 构建可用组合
  const combinations: any[] = []
  for (const modelImage of modelImages) {
    // 找出这个模特图已经生成了哪些定妆图
    const existingStyleImageMap = new Map(
      modelImage.styleImages.map(s => [s.poseId, s.id])
    )

    for (const pose of poses) {
      // 跳过已生成的
      if (existingStyleImageMap.has(pose.id)) continue

      combinations.push({
        id: `${pose.id}-${modelImage.id}`,
        pose,
        modelImage: {
          id: modelImage.id,
          url: modelImage.url,
          productName: modelImage.product?.name,
        },
        existingStyleImageId: null,
      })
    }
  }

  return NextResponse.json(combinations)
}
```

- [ ] **Step 3: 更新 tools API 添加链接**

```typescript
// app/api/tools/route.ts
{
  id: StyleImageTool.id,
  name: '定妆图生成',
  description: '结合模特图和姿势、妆容、饰品生成定妆图',
  icon: '💄',
  gradient: 'from-emerald-400 to-teal-500',
  href: '/tools/style-image',  // 修改这行
  inputs: StyleImageTool.inputs,
  outputs: StyleImageTool.outputs,
},
```

- [ ] **Step 4: 提交**

```bash
git add app/\(app\)/tools/style-image/ app/api/tools/combination/style-images/route.ts app/api/tools/route.ts
git commit -m "feat: add style image generation tool page"
```

---

## Task 4: 首帧图生成页面

**Files:**
- Create: `app/(app)/tools/first-frame/page.tsx`
- Create: `app/api/tools/combination/first-frames/route.ts`

- [ ] **Step 1: 创建首帧图生成页面**

```tsx
// app/(app)/tools/first-frame/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { GeneratedCombination } from '@/components/video-generation/types'

export default function FirstFramePage() {
  const [loading, setLoading] = useState(true)
  const [availableCombinations, setAvailableCombinations] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/first-frames')
      .then(res => res.json())
      .then(data => {
        setAvailableCombinations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const scenes = availableCombinations.map((c: any) => ({
    id: c.scene.id,
    name: c.scene.name,
    url: c.scene.url,
  }))

  const styleImages = availableCombinations.map((c: any) => ({
    id: c.styleImage.id,
    name: `定妆图 ${c.styleImage.id.slice(0, 8)}`,
    url: c.styleImage.url,
  }))

  const existingIds = availableCombinations
    .filter((c: any) => c.existingFirstFrameId)
    .map((c: any) => `${c.scene.id}-${c.styleImage.id}`)

  const handleGenerate = async (combinations: GeneratedCombination[]) => {
    setGenerating(true)
    try {
      for (const combo of combinations) {
        const [sceneId, styleImageId] = combo.key.split('-')
        const comboData = availableCombinations.find(
          (c: any) => c.scene.id === sceneId && c.styleImage.id === styleImageId
        )
        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'first-frame',
            styleImageId,
            sceneId,
            productId: comboData.productId,
            ipId: comboData.ipId,
          }),
        })
      }
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <CombinationToolPage
      title="首帧图生成"
      description="选择场景和定妆图，生成首帧图"
      icon="🌄"
    >
      <CombinationSelector
        type="first-frame"
        itemsA={scenes}
        itemsB={styleImages}
        existingIds={existingIds}
        loading={loading}
        generating={generating}
        onGenerate={handleGenerate}
      />
    </CombinationToolPage>
  )
}
```

- [ ] **Step 2: 创建获取可用首帧图组合 API**

```typescript
// app/api/tools/combination/first-frames/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/first-frames
export async function GET() {
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

  // 获取用户的定妆图
  const styleImages = await db.styleImage.findMany({
    where: { ipId: { in: ipIds } },
    include: {
      product: { select: { id: true } },
      firstFrames: { select: { id: true, sceneId: true } },
    },
  })

  // 获取用户有权限的场景（公共 + 自己的）
  const scenes = await db.material.findMany({
    where: {
      type: 'SCENE',
      OR: [{ userId }, { visibility: 'public' }],
    },
    select: { id: true, name: true, url: true },
  })

  // 构建可用组合
  const combinations: any[] = []
  for (const styleImage of styleImages) {
    const existingFirstFrameMap = new Map(
      styleImage.firstFrames.map(f => [f.sceneId, f.id])
    )

    for (const scene of scenes) {
      if (existingFirstFrameMap.has(scene.id)) continue

      combinations.push({
        id: `${scene.id}-${styleImage.id}`,
        scene,
        styleImage: {
          id: styleImage.id,
          url: styleImage.url,
        },
        productId: styleImage.productId,
        ipId: styleImage.ipId,
        existingFirstFrameId: null,
      })
    }
  }

  return NextResponse.json(combinations)
}
```

- [ ] **Step 3: 更新 tools API 添加链接**

```typescript
// app/api/tools/route.ts
{
  id: SceneReplaceTool.id,
  name: '场景替换',
  description: '将人物与场景融合，生成首帧图',
  icon: '🌄',
  gradient: 'from-orange-400 to-amber-500',
  href: '/tools/first-frame',  // 修改这行
  inputs: SceneReplaceTool.inputs,
  outputs: SceneReplaceTool.outputs,
},
```

- [ ] **Step 4: 提交**

```bash
git add app/\(app\)/tools/first-frame/ app/api/tools/combination/first-frames/route.ts
git commit -m "feat: add first frame generation tool page"
```

---

## Task 5: 单元测试

**Files:**
- Create: `domains/video-generation/service.test.ts`
- Create: `components/video-generation/__tests__/types.test.ts`

- [ ] **Step 1: 编写 service 层单元测试（批量生成去重逻辑）**

```typescript
// domains/video-generation/service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateModelImage } from '../service'

// Mock database
vi.mock('@/foundation/lib/db', () => ({
  db: {
    virtualIp: {
      findUnique: vi.fn(),
    },
    modelImage: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('generateModelImage deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing model image if already generated', async () => {
    const mockIp = { fullBodyUrl: 'https://example.com/body.jpg' }
    const existingImage = {
      id: 'existing-id',
      url: 'https://example.com/model.jpg',
      productId: 'product-1',
      ipId: 'ip-1',
    }

    vi.mocked(db.virtualIp.findUnique).mockResolvedValue(mockIp as any)
    vi.mocked(db.modelImage.findUnique).mockResolvedValue(existingImage as any)

    const result = await generateModelImage('product-1', 'ip-1', 'https://example.com/product.jpg', [])

    expect(result.modelImageId).toBe('existing-id')
    expect(result.modelImageUrl).toBe('https://example.com/model.jpg')
    expect(db.modelImage.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 编写 types 测试**

```typescript
// components/video-generation/__tests__/types.test.ts
import { describe, it, expect } from 'vitest'
import { getCombinationLabels } from '../types'

describe('getCombinationLabels', () => {
  it('returns correct labels for model-image', () => {
    expect(getCombinationLabels('model-image')).toEqual({ a: '虚拟IP', b: '产品' })
  })

  it('returns correct labels for style-image', () => {
    expect(getCombinationLabels('style-image')).toEqual({ a: '姿势', b: '模特图' })
  })

  it('returns correct labels for first-frame', () => {
    expect(getCombinationLabels('first-frame')).toEqual({ a: '场景', b: '定妆图' })
  })
})
```

- [ ] **Step 3: 运行所有测试**

```bash
yarn test
```

Expected: All tests pass

- [ ] **Step 4: 提交**

```bash
git add domains/video-generation/service.test.ts components/video-generation/__tests__/
git commit -m "test: add unit tests for combination generator tools"
```

---

## Self-Review 检查清单

1. **Spec coverage:**
   - [x] 模特图生成页面 - Task 2
   - [x] 定妆图生成页面 - Task 3
   - [x] 首帧图生成页面 - Task 4
   - [x] 过滤已生成逻辑 - 各 API 路由中实现
   - [x] 单元测试 - Task 5

2. **Placeholder scan:** 无 TBD/TODO，已填充完整代码

3. **Type consistency:** 类型贯穿全文一致
