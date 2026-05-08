# 当日发布计划 V2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现当日发布计划的 V2 交互：一个产品可被多个 IP 发布，支持分层展示（主页勾选 + 详情页选视频）

**Architecture:**
- 复用现有 `DailyPublishPlan` 表（产品级别记录）作为基础
- 扩展 `VideoPush` 支持多 IP 场景
- 前端分为主页（全部视图）和 IP 详情页

**Tech Stack:** Next.js App Router, Prisma, React

---

## 文件结构

```
prisma/schema.prisma                    # 修改: VideoPush.ipId 改为可选
app/api/daily-publish-plan/
  [date]/products/route.ts             # 修改: 返回产品列表 + 各IP勾选状态
  ip-detail/route.ts                   # 新增: 获取IP详情（视频列表）
  assign-ip/route.ts                   # 新增: 分配IP到产品
app/(app)/daily-publish-plan/
  page.tsx                             # 修改: 全部视图（勾选IP）
  ip/[ipId]/[productId]/page.tsx       # 新增: IP详情页
docs/superpowers/specs/2026-05-08-daily-publish-plan-v2-design.md  # 已有设计文档
```

---

## Task 1: 数据库变更 - VideoPush.ipId 改为可选

**Files:**
- Modify: `prisma/schema.prisma:468-489`

- [ ] **Step 1: 修改 VideoPush.ipId 为可选**

修改 `prisma/schema.prisma` 第 473 行：
```prisma
// 修改前
ipId            String   @map("ip_id") @db.VarChar(36)

// 修改后
ipId            String?  @map("ip_id") @db.VarChar(36)  // 可选，支持多IP发布
```

- [ ] **Step 2: 执行数据库迁移**

Run: `npx prisma db push`
Expected: 迁移成功，ip_id 字段允许 NULL

- [ ] **Step 3: 提交**

```bash
git add prisma/schema.prisma
git commit -m "feat: VideoPush.ipId 改为可选，支持多IP发布场景"
```

---

## Task 2: API - 获取当日发布计划产品列表（支持多IP）

**Files:**
- Modify: `app/api/daily-publish-plan/[date]/products/route.ts:1-134`

- [ ] **Step 1: 分析当前代码，理解现有逻辑**

当前返回格式：
```typescript
{
  productId, productName, productImage, ipId,  // 一个产品只返回一个ipId
  aiVideoCount, pushableCount, publishedCount, clippableCount, newGeneratableCount
}
```

新返回格式需要：
```typescript
{
  productId, productName, productImage,
  ips: [
    { ipId: "IP-A", selected: true, videoCount: 5 },
    { ipId: "IP-B", selected: false, videoCount: 3 }
  ]
}
```

- [ ] **Step 2: 重写 products API 返回格式**

在 `app/api/daily-publish-plan/[date]/products/route.ts` 中修改 GET 函数：

```typescript
// GET /api/daily-publish-plan/:date/products
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const date = new Date(params.date)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // 获取该日期的所有产品
    const plans = await db.dailyPublishPlan.findMany({
      where: {
        userId: session.user.id,
        planDate: date,
      },
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
          },
        },
      },
    })

    // 对每个产品，获取其关联的所有IP及视频统计
    const products = await Promise.all(
      plans.map(async plan => {
        // 获取该产品的所有IP（从video表去重）
        const ipIds = await db.video.findMany({
          where: { productId: plan.productId },
          select: { ipId: true },
          distinct: ['ipId']
        })

        const ips = await Promise.all(
          ipIds.map(async ({ ipId }) => {
            if (!ipId) return null

            // 统计该 product + ip 的视频数
            const videoCount = await db.video.count({
              where: { productId: plan.productId, ipId }
            })

            // 检查是否已有VideoPush记录（selected状态）
            const hasVideoPush = await db.videoPush.findFirst({
              where: { productId: plan.productId, ipId }
            })

            return {
              ipId,
              selected: !!hasVideoPush,
              videoCount
            }
          })
        )

        return {
          productId: plan.productId,
          productName: plan.product.name,
          productImage: plan.product.images[0]?.url || '',
          ips: ips.filter(Boolean)
        }
      })
    )

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 测试 API**

Run: `curl -H "Cookie: ..." "http://localhost:3000/api/daily-publish-plan/2026-05-08/products"`
Expected: 返回 `{ products: [{ productId, productName, ips: [...] }] }`

- [ ] **Step 4: 提交**

```bash
git add app/api/daily-publish-plan/[date]/products/route.ts
git commit -m "feat: daily-publish-plan API 支持多IP返回格式"
```

---

## Task 3: API - 获取 IP 详情

**Files:**
- Create: `app/api/daily-publish-plan/ip-detail/route.ts`

- [ ] **Step 1: 创建 IP 详情 API**

Create `app/api/daily-publish-plan/ip-detail/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/daily-publish-plan/ip-detail?productId=xxx&ipId=yyy
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const ipId = searchParams.get('ipId')

  if (!productId || !ipId) {
    return NextResponse.json({ error: 'productId and ipId are required' }, { status: 400 })
  }

  try {
    // 获取该 product + ip 的所有 VideoPush 记录
    const videoPushes = await db.videoPush.findMany({
      where: { productId, ipId },
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    })

    // 获取已选中的视频ID列表
    const selectedVideoIds = videoPushes
      .filter(vp => vp.isQualified && !vp.isPublished)
      .map(vp => vp.videoId)

    // 获取该 product + ip 的所有视频用于选择
    const videos = await db.video.findMany({
      where: { productId, ipId },
      select: { id: true, url: true, thumbnail: true, createdAt: true }
    })

    return NextResponse.json({
      productId,
      ipId,
      productName: videoPushes[0]?.product?.name || '',
      selectedVideos: selectedVideoIds,
      videos: videos.map(v => ({
        id: v.id,
        url: v.url,
        thumbnail: v.thumbnail,
        createdAt: v.createdAt
      }))
    })
  } catch (error) {
    console.error('Failed to fetch IP detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 测试 API**

Run: `curl -H "Cookie: ..." "http://localhost:3000/api/daily-publish-plan/ip-detail?productId=xxx&ipId=yyy"`
Expected: 返回 `{ productId, ipId, productName, selectedVideos, videos }`

- [ ] **Step 3: 提交**

```bash
git add app/api/daily-publish-plan/ip-detail/route.ts
git commit -m "feat: 添加 IP 详情 API"
```

---

## Task 4: API - 分配 IP 到产品

**Files:**
- Create: `app/api/daily-publish-plan/assign-ip/route.ts`

- [ ] **Step 1: 创建分配 IP API**

Create `app/api/daily-publish-plan/assign-ip/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/daily-publish-plan/assign-ip
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, ipId, date } = body

    if (!productId || !ipId || !date) {
      return NextResponse.json({ error: 'productId, ipId, date are required' }, { status: 400 })
    }

    // 检查是否已存在 VideoPush 记录
    const existing = await db.videoPush.findFirst({
      where: { productId, ipId }
    })

    if (existing) {
      return NextResponse.json({ message: 'IP already assigned', videoPush: existing })
    }

    // 创建新的 VideoPush 记录
    const videoPush = await db.videoPush.create({
      data: {
        productId,
        ipId,
        videoId: '',
        videoIdHash: '',
        sceneId: '',
        status: 'pending'
      }
    })

    return NextResponse.json({ message: 'IP assigned successfully', videoPush })
  } catch (error) {
    console.error('Failed to assign IP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 测试 API**

Run:
```bash
curl -X POST -H "Content-Type: application/json" -H "Cookie: ..." \
  -d '{"productId":"xxx","ipId":"yyy","date":"2026-05-08"}' \
  "http://localhost:3000/api/daily-publish-plan/assign-ip"
```
Expected: 返回 `{ message: 'IP assigned successfully', videoPush: {...} }`

- [ ] **Step 3: 提交**

```bash
git add app/api/daily-publish-plan/assign-ip/route.ts
git commit -m "feat: 添加分配 IP 到产品 API"
```

---

## Task 5: API - 搜索可追素材的商品

**Files:**
- Create: `app/api/products/search-for-ip/route.ts`

- [ ] **Step 1: 创建搜索商品 API**

Create `app/api/products/search-for-ip/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/products/search-for-ip?ipId=xxx&filter=published&search=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ipId = searchParams.get('ipId')
  const filter = searchParams.get('filter') || 'all'  // all | published | library
  const search = searchParams.get('search') || ''

  if (!ipId) {
    return NextResponse.json({ error: 'ipId is required' }, { status: 400 })
  }

  try {
    // 获取该 IP 发布过的所有产品
    const publishedProducts = await db.videoPush.findMany({
      where: { ipId, isPublished: true },
      select: { productId: true }
    })
    const publishedProductIds = [...new Set(publishedProducts.map(p => p.productId))]

    let products
    if (filter === 'published') {
      // 只返回该 IP 发布过的产品
      products = await db.product.findMany({
        where: {
          id: { in: publishedProductIds },
          name: { contains: search }
        },
        include: {
          images: { where: { isMain: true }, take: 1 },
          _count: {
            select: {
              videos: { where: { ipId } }
            }
          }
        }
      })
    } else if (filter === 'library') {
      // 只返回未发布过的产品
      products = await db.product.findMany({
        where: {
          id: { notIn: publishedProductIds },
          name: { contains: search }
        },
        include: {
          images: { where: { isMain: true }, take: 1 }
        }
      })
    } else {
      // 返回所有产品
      products = await db.product.findMany({
        where: { name: { contains: search } },
        include: {
          images: { where: { isMain: true }, take: 1 },
          _count: {
            select: {
              videos: { where: { ipId } }
            }
          }
        }
      })
    }

    // 计算每个产品的发布统计
    const result = await Promise.all(
      products.map(async product => {
        const publishCount = publishedProducts.filter(p => p.productId === product.id).length
        // 获取历史数据表现（简化：发布次数>3次标记为数据好）
        const hasGoodData = publishCount >= 3

        return {
          productId: product.id,
          name: product.name,
          image: product.images[0]?.url || '',
          publishCount,
          hasGoodData,
          isInDailyPlan: false  // TODO: 检查是否已加入当日计划
        }
      })
    )

    return NextResponse.json({ products: result })
  } catch (error) {
    console.error('Failed to search products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 测试 API**

Run: `curl -H "Cookie: ..." "http://localhost:3000/api/products/search-for-ip?ipId=xxx&filter=published"`
Expected: 返回该 IP 发布过的产品列表

- [ ] **Step 3: 提交**

```bash
git add app/api/products/search-for-ip/route.ts
git commit -m "feat: 添加 IP 追素材商品搜索 API"
```

---

## Task 6: 前端 - 当日发布计划主页（全部视图）

**Files:**
- Modify: `app/(app)/daily-publish-plan/page.tsx`

- [ ] **Step 1: 修改页面组件适配新的数据格式**

原数据结构：
```typescript
{ productId, productName, productImage, ipId, aiVideoCount, ... }
```

新数据结构：
```typescript
{ productId, productName, productImage, ips: [{ ipId, selected, videoCount }] }
```

主要改动：
1. 改变产品列表的渲染逻辑，遍历 `ips` 数组
2. IP 勾选框的交互（☑/□）
3. 点击 IP 行进入详情页

- [ ] **Step 2: 添加导航到 IP 详情页的逻辑**

当用户点击 IP 行的 **▶** 或 **查看详情** 时：
```typescript
router.push(`/daily-publish-plan/ip/${ipId}/${productId}`)
```

- [ ] **Step 3: 测试页面**

访问 `/daily-publish-plan`，验证：
- 产品列表正确显示
- IP 勾选框可交互
- 点击 IP 行能跳转

- [ ] **Step 4: 提交**

```bash
git add app/(app)/daily-publish-plan/page.tsx
git commit -m "feat: 当日发布计划主页支持多IP勾选"
```

---

## Task 7: 前端 - IP 详情页

**Files:**
- Create: `app/(app)/daily-publish-plan/ip/[ipId]/[productId]/page.tsx`

- [ ] **Step 1: 创建 IP 详情页组件**

Create `app/(app)/daily-publish-plan/ip/[ipId]/[productId]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface Video {
  id: string
  url: string
  thumbnail: string | null
  createdAt: string
}

interface IpDetailPageProps {
  params: { ipId: string; productId: string }
}

export default function IpDetailPage({ params }: IpDetailPageProps) {
  const { ipId, productId } = params
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<{
    productId: string
    ipId: string
    productName: string
    selectedVideos: string[]
    videos: Video[]
  } | null>(null)
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchIpDetail()
  }, [ipId, productId])

  const fetchIpDetail = async () => {
    try {
      const res = await fetch(`/api/daily-publish-plan/ip-detail?productId=${productId}&ipId=${ipId}`)
      if (res.ok) {
        const data = await res.json()
        setDetail(data)
        setSelectedVideoIds(new Set(data.selectedVideos))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleVideo = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev)
      next.has(videoId) ? next.delete(videoId) : next.add(videoId)
      return next
    })
  }

  if (loading) {
    return <div className="p-8 text-center">加载中...</div>
  }

  if (!detail) {
    return <div className="p-8 text-center">未找到数据</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-warm-silver hover:text-warm-charcoal">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-warm-charcoal">
          {detail.productName} - {ipId} 发布计划
        </h1>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <span className="text-lg">
          已选 {selectedVideoIds.size}/{detail.videos.length} 个视频
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button variant="outline" className="border-oat">剪辑</Button>
        <Button variant="outline" className="border-oat">新增</Button>
        <Button variant="outline" className="border-oat">选择发布视频</Button>
        <Button variant="outline" className="border-oat">添加商品</Button>
      </div>

      {/* Video List */}
      <div className="grid grid-cols-3 gap-4">
        {detail.videos.map(video => (
          <div
            key={video.id}
            onClick={() => toggleVideo(video.id)}
            className={cn(
              'relative rounded-xl border-2 cursor-pointer overflow-hidden',
              selectedVideoIds.has(video.id)
                ? 'border-matcha-600 bg-matcha-50'
                : 'border-transparent hover:border-oat'
            )}
          >
            {video.thumbnail ? (
              <img src={getImageUrl(video.thumbnail)} alt="" className="w-full aspect-video object-cover" />
            ) : (
              <div className="w-full aspect-video bg-oat flex items-center justify-center text-warm-silver">
                无封面
              </div>
            )}
            {selectedVideoIds.has(video.id) && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-matcha-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirm Button */}
      <div className="mt-6">
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          确认发布计划 ({selectedVideoIds.size})
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 添加添加商品弹窗（基础版本）**

在 IP 详情页添加 [添加商品] 按钮的弹窗逻辑

- [ ] **Step 3: 测试 IP 详情页**

访问 `/daily-publish-plan/ip/IP-A/product123`：
- 页面正确显示
- 视频列表正确显示
- 视频选择可交互

- [ ] **Step 4: 提交**

```bash
git add app/(app)/daily-publish-plan/ip/[ipId]/[productId]/page.tsx
git commit -m "feat: 添加 IP 详情页"
```

---

## Task 8: 前端 - 添加商品弹窗（追素材）

**Files:**
- Modify: `app/(app)/daily-publish-plan/ip/[ipId]/[productId]/page.tsx` (添加到现有页面)

- [ ] **Step 1: 添加弹窗状态和 UI**

```typescript
const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)
const [searchFilter, setSearchFilter] = useState<'all' | 'published' | 'library'>('all')
const [searchQuery, setSearchQuery] = useState('')
const [searchResults, setSearchResults] = useState([])

const openAddProductDialog = async () => {
  setAddProductDialogOpen(true)
  await searchProducts()
}

const searchProducts = async () => {
  const res = await fetch(`/api/products/search-for-ip?ipId=${ipId}&filter=${searchFilter}&search=${searchQuery}`)
  if (res.ok) {
    const data = await res.json()
    setSearchResults(data.products)
  }
}
```

- [ ] **Step 2: 渲染添加商品弹窗 UI**

使用 Dialog 组件展示商品搜索和选择界面

- [ ] **Step 3: 测试弹窗**

点击 [添加商品] → 弹窗正确显示 → 筛选可切换

- [ ] **Step 4: 提交**

```bash
git add app/(app)/daily-publish-plan/ip/[ipId]/[productId]/page.tsx
git commit -m "feat: IP详情页添加商品弹窗支持追素材"
```

---

## 实施检查清单

- [ ] Task 1: 数据库变更完成
- [ ] Task 2: products API 支持多IP
- [ ] Task 3: IP详情 API
- [ ] Task 4: 分配IP API
- [ ] Task 5: 搜索商品 API
- [ ] Task 6: 当日发布计划主页改造
- [ ] Task 7: IP详情页
- [ ] Task 8: 添加商品弹窗

---

## 实施顺序建议

1. **Task 1 (数据库)** → 基础准备
2. **Task 2 (API)** → 数据层改造
3. **Task 3-5 (API)** → 增量 API
4. **Task 6-8 (前端)** → UI 层改造

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-daily-publish-plan-v2-implementation.md`**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
