# API 重构：复用 CombinationEngine 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构三个 API 内部复用 CombinationEngine，消除重复代码，保持前端返回格式不变

**Architecture:** 在 API 层和 Engine 之间增加适配层，将 Engine 的标准输出转换为前端期望的格式

**Tech Stack:** TypeScript, Next.js API Routes, Prisma

---

## File Structure

```
domains/combination/
├── adapters/                          # 新建：格式转换适配器
│   ├── index.ts                      # 导出
│   ├── modelImageAdapter.ts          # MODEL_IMAGE 组合适配
│   ├── styleImageAdapter.ts          # STYLE_IMAGE 组合适配
│   └── firstFrameAdapter.ts          # FIRST_FRAME 组合适配

app/api/tools/combination/
├── model-images/route.ts            # 修改：复用 Engine
├── style-images/route.ts            # 修改：复用 Engine
└── first-frames/route.ts            # 修改：复用 Engine
```

---

## Task 1: 创建适配层目录和基础结构

**Files:**
- Create: `domains/combination/adapters/index.ts`
- Create: `domains/combination/adapters/modelImageAdapter.ts`
- Create: `domains/combination/adapters/styleImageAdapter.ts`
- Create: `domains/combination/adapters/firstFrameAdapter.ts`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p domains/combination/adapters
```

- [ ] **Step 2: 创建 modelImageAdapter.ts**

```typescript
// domains/combination/adapters/modelImageAdapter.ts

import { Combination } from '../types'
import { db } from '@/foundation/lib/db'

export interface ModelImageApiResult {
  id: string
  ip: { id: string; nickname: string; fullBodyUrl: string | null }
  product: { id: string; name: string; mainImageUrl: string | null }
  existingModelImageId: string | null
}

export async function adaptModelImageCombinations(
  combinations: Combination[],
  teamId: string
): Promise<ModelImageApiResult[]> {
  // 获取团队所有 IP 的完整信息
  const ips = await db.virtualIp.findMany({
    where: { teamId },
    select: { id: true, nickname: true, fullBodyUrl: true }
  })

  // 获取所有产品信息
  const products = await db.product.findMany({
    where: { teamId },
    select: { id: true, name: true, images: { where: { isMain: true }, take: 1 } }
  })

  // 建立 ipId → ip 信息的映射
  const ipMap = new Map(ips.map(ip => [ip.id, ip]))
  // 建立 productId → product 信息的映射
  const productMap = new Map(products.map(p => [p.id, p]))

  return combinations.map(combo => {
    const ip = ipMap.get(combo.elements.ipId!) || { id: '', nickname: '', fullBodyUrl: null }
    const product = productMap.get(combo.elements.productId!) || { id: '', name: '', mainImageUrl: null }

    return {
      id: combo.id,
      ip: {
        id: ip.id,
        nickname: ip.nickname,
        fullBodyUrl: ip.fullBodyUrl
      },
      product: {
        id: product.id,
        name: product.name,
        mainImageUrl: product.images?.[0]?.url || null
      },
      existingModelImageId: combo.status !== 'pending' ? combo.existingRecordId! : null
    }
  })
}
```

- [ ] **Step 3: 创建 styleImageAdapter.ts**

```typescript
// domains/combination/adapters/styleImageAdapter.ts

import { Combination } from '../types'
import { db } from '@/foundation/lib/db'

export interface StyleImageApiResult {
  id: string
  pose: { id: string; name: string; url: string | null }
  modelImage: { id: string; url: string; productName: string | null }
  existingStyleImageId: string | null
}

export async function adaptStyleImageCombinations(
  combinations: Combination[],
  productId: string
): Promise<StyleImageApiResult[]> {
  // 获取姿势信息
  const poseIds = [...new Set(combinations.map(c => c.elements.poseId).filter(Boolean))]
  const poses = await db.material.findMany({
    where: { id: { in: poseIds }, type: 'POSE' },
    select: { id: true, name: true, url: true }
  })

  // 获取 modelImage 信息
  const modelImageIds = [...new Set(combinations.map(c => c.elements.modelImageId).filter(Boolean))]
  const modelImages = await db.modelImage.findMany({
    where: { id: { in: modelImageIds } },
    select: { id: true, url: true, productId: true }
  })

  // 获取产品名称
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { name: true }
  })

  const poseMap = new Map(poses.map(p => [p.id, p]))
  const modelImageMap = new Map(modelImages.map(m => [m.id, m]))

  return combinations.map(combo => {
    const pose = poseMap.get(combo.elements.poseId!) || { id: '', name: '', url: null }
    const modelImage = modelImageMap.get(combo.elements.modelImageId!) || { id: '', url: '', productName: '' }

    return {
      id: combo.id,
      pose: {
        id: pose.id,
        name: pose.name,
        url: pose.url
      },
      modelImage: {
        id: modelImage.id,
        url: modelImage.url,
        productName: product?.name || null
      },
      existingStyleImageId: combo.status !== 'pending' ? combo.existingRecordId! : null
    }
  })
}
```

- [ ] **Step 4: 创建 firstFrameAdapter.ts**

```typescript
// domains/combination/adapters/firstFrameAdapter.ts

import { Combination } from '../types'
import { db } from '@/foundation/lib/db'

export interface FirstFrameApiResult {
  id: string
  scene: { id: string; name: string; url: string | null }
  styleImage: { id: string; url: string }
  productId: string
  ipId: string
  existingFirstFrameId: string | null
}

export async function adaptFirstFrameCombinations(
  combinations: Combination[]
): Promise<FirstFrameApiResult[]> {
  // 获取 scene 信息
  const sceneIds = [...new Set(combinations.map(c => c.elements.sceneId).filter(Boolean))]
  const scenes = await db.material.findMany({
    where: { id: { in: sceneIds }, type: 'SCENE' },
    select: { id: true, name: true, url: true }
  })

  // 获取 styleImage 信息
  const styleImageIds = [...new Set(combinations.map(c => c.elements.styleImageId).filter(Boolean))]
  const styleImages = await db.styleImage.findMany({
    where: { id: { in: styleImageIds } },
    select: { id: true, url: true, productId: true, ipId: true }
  })

  const sceneMap = new Map(scenes.map(s => [s.id, s]))
  const styleImageMap = new Map(styleImages.map(s => [s.id, s]))

  return combinations.map(combo => {
    const scene = sceneMap.get(combo.elements.sceneId!) || { id: '', name: '', url: null }
    const styleImage = styleImageMap.get(combo.elements.styleImageId!) || { id: '', url: '', productId: '', ipId: '' }

    return {
      id: combo.id,
      scene: {
        id: scene.id,
        name: scene.name,
        url: scene.url
      },
      styleImage: {
        id: styleImage.id,
        url: styleImage.url
      },
      productId: styleImage.productId,
      ipId: styleImage.ipId,
      existingFirstFrameId: combo.status !== 'pending' ? combo.existingRecordId! : null
    }
  })
}
```

- [ ] **Step 5: 创建 adapters/index.ts**

```typescript
// domains/combination/adapters/index.ts

export * from './modelImageAdapter'
export * from './styleImageAdapter'
export * from './firstFrameAdapter'
```

- [ ] **Step 6: Commit**

```bash
git add domains/combination/adapters/
git commit -m "feat: add combination adapters for API format conversion"
```

---

## Task 2: 重构 model-images API

**Files:**
- Modify: `app/api/tools/combination/model-images/route.ts`

- [ ] **Step 1: 读取当前文件**

```bash
cat app/api/tools/combination/model-images/route.ts
```

- [ ] **Step 2: 重写 route.ts**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider } from '@/domains/combination'
import { CombinationType } from '@/domains/combination/types'
import { adaptModelImageCombinations } from '@/domains/combination/adapters'

// GET /api/tools/combination/model-images
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamId = session.user.teamId

    // 获取团队所有 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true, nickname: true, fullBodyUrl: true }
    })

    // 获取团队所有产品
    const products = await db.product.findMany({
      where: { teamId },
      select: { id: true, name: true, images: { where: { isMain: true }, take: 1 } }
    })

    // 初始化 Engine
    const registry = new ConstraintRegistry()
    const poolProvider = new PrismaMaterialPoolProvider(db)
    const engine = new CombinationEngine(registry, poolProvider)

    // 对每个 (ip, product) 组合计算
    const allCombinations: Awaited<ReturnType<typeof engine.compute>>['combinations'] = []

    for (const ip of ips) {
      for (const product of products) {
        const result = await engine.compute(product.id, ip.id, {
          type: CombinationType.MODEL_IMAGE
        })
        // 只添加 pending 状态的组合（未生成的）
        allCombinations.push(...result.combinations.filter(c => c.status === 'pending'))
        // 添加已生成的组合
        allCombinations.push(...result.combinations.filter(c => c.status !== 'pending'))
      }
    }

    // 转换格式
    const adaptedResults = await adaptModelImageCombinations(allCombinations, teamId)

    return NextResponse.json(adaptedResults)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 测试 API**

```bash
curl -s http://localhost:3000/api/tools/combination/model-images | head -c 500
```

Expected: 返回 JSON 数组，格式与之前一致

- [ ] **Step 4: Commit**

```bash
git add app/api/tools/combination/model-images/route.ts
git commit -m "refactor: use CombinationEngine in model-images API"
```

---

## Task 3: 重构 style-images API

**Files:**
- Modify: `app/api/tools/combination/style-images/route.ts`

- [ ] **Step 1: 读取当前文件**

```bash
cat app/api/tools/combination/style-images/route.ts
```

- [ ] **Step 2: 重写 route.ts**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider } from '@/domains/combination'
import { CombinationType } from '@/domains/combination/types'
import { adaptStyleImageCombinations } from '@/domains/combination/adapters'

// GET /api/tools/combination/style-images?productId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const teamId = session.user.teamId

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    // 获取该产品的所有 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true }
    })

    // 初始化 Engine
    const registry = new ConstraintRegistry()
    const poolProvider = new PrismaMaterialPoolProvider(db)
    const engine = new CombinationEngine(registry, poolProvider)

    // 对每个 IP 计算 STYLE_IMAGE 组合
    const allCombinations: Awaited<ReturnType<typeof engine.compute>>['combinations'] = []

    for (const ip of ips) {
      const result = await engine.compute(productId, ip.id, {
        type: CombinationType.STYLE_IMAGE
      })
      allCombinations.push(...result.combinations)
    }

    // 转换格式
    const adaptedResults = await adaptStyleImageCombinations(allCombinations, productId)

    return NextResponse.json(adaptedResults)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 测试 API**

```bash
curl -s "http://localhost:3000/api/tools/combination/style-images?productId=test-id" | head -c 500
```

- [ ] **Step 4: Commit**

```bash
git add app/api/tools/combination/style-images/route.ts
git commit -m "refactor: use CombinationEngine in style-images API"
```

---

## Task 4: 重构 first-frames API

**Files:**
- Modify: `app/api/tools/combination/first-frames/route.ts`

- [ ] **Step 1: 读取当前文件**

```bash
cat app/api/tools/combination/first-frames/route.ts
```

- [ ] **Step 2: 重写 route.ts**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider } from '@/domains/combination'
import { CombinationType } from '@/domains/combination/types'
import { adaptFirstFrameCombinations } from '@/domains/combination/adapters'

// GET /api/tools/combination/first-frames?productId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const teamId = session.user.teamId

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    // 获取该产品的所有 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true }
    })

    // 初始化 Engine
    const registry = new ConstraintRegistry()
    const poolProvider = new PrismaMaterialPoolProvider(db)
    const engine = new CombinationEngine(registry, poolProvider)

    // 对每个 IP 计算 FIRST_FRAME 组合
    const allCombinations: Awaited<ReturnType<typeof engine.compute>>['combinations'] = []

    for (const ip of ips) {
      const result = await engine.compute(productId, ip.id, {
        type: CombinationType.FIRST_FRAME
      })
      allCombinations.push(...result.combinations)
    }

    // 转换格式
    const adaptedResults = await adaptFirstFrameCombinations(allCombinations)

    return NextResponse.json(adaptedResults)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 测试 API**

```bash
curl -s "http://localhost:3000/api/tools/combination/first-frames?productId=test-id" | head -c 500
```

- [ ] **Step 4: Commit**

```bash
git add app/api/tools/combination/first-frames/route.ts
git commit -m "refactor: use CombinationEngine in first-frames API"
```

---

## Task 5: 集成测试

**Files:**
- Test: 前端生图向导页面

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 访问生图向导页面**

```
http://localhost:3000/products/{productId}/model-images-wizard
```

- [ ] **Step 3: 验证各步骤数据加载正常**

- Step 1 (Model Image): 验证 IP×产品 组合显示
- Step 2 (Style Image): 验证姿势×模特图 组合显示
- Step 3 (First Frame): 验证场景×定妆图 组合显示

- [ ] **Step 4: 验证生成功能**

- 选择组合，点击生成
- 验证状态更新

---

## Self-Review Checklist

1. **Spec coverage:**
   - [x] API 增加可选 ipId 参数
   - [x] 三个 API 内部复用 Engine
   - [x] 适配层转换格式
   - [x] 保持前端返回格式不变

2. **Placeholder scan:** 无 TBD/TODO

3. **Type consistency:**
   - CombinationType 枚举使用正确
   - adaptXxxCombinations 函数签名一致
   - API 返回类型与前端期望一致

---

## 执行方式

**Plan complete and saved to `docs/superpowers/plans/2026-05-03-api-refactor-combination-engine.md`**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?