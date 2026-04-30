# 当日发布计划实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现当日发布计划功能 - 浮窗购物车形式添加产品到每日发布计划

**Architecture:**
- 新建 `daily_publish_plan` 数据表存储发布计划
- 创建 RESTful API 路由处理 CRUD 操作
- 创建右下角浮窗组件显示已添加产品
- 在产品详情页和列表页添加入口按钮

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma

---

## 文件结构

```
新建:
- prisma/schema.prisma                           # 添加 DailyPublishPlan model
- app/api/daily-publish-plan/route.ts            # GET/POST API
- app/api/daily-publish-plan/[id]/route.ts        # DELETE API
- app/api/daily-publish-plan/batch/route.ts       # 批量添加 API
- components/daily-publish-plan/DailyPublishPlanFloating.tsx  # 浮窗组件
- components/daily-publish-plan/DailyPublishPlanProvider.tsx  # Context Provider

修改:
- app/(app)/products/[id]/ProductDetail.tsx       # 添加单个添加按钮
- app/(app)/products/page.tsx                     # 添加批量选择和添加
- app/(app)/layout.tsx                             # 添加 Provider 包裹
```

---

## Task 1: 更新 Prisma Schema 添加 DailyPublishPlan Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 添加 DailyPublishPlan Model**

在 `prisma/schema.prisma` 末尾（`VirtualIpScene` model 之后）添加：

```prisma
model DailyPublishPlan {
  id         String   @id @default(uuid()) @db.VarChar(36)
  userId     String   @map("user_id") @db.VarChar(36)
  productId  String   @map("product_id") @db.VarChar(36)
  planDate   DateTime @db.Date @map("plan_date")
  createdAt  DateTime @default(now()) @map("created_at")
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id])

  @@unique([userId, productId, planDate], name: "uk_daily_publish_plan_user_product_date")
  @@index([userId], map: "idx_daily_publish_plan_user")
  @@index([productId], map: "idx_daily_publish_plan_product")
  @@index([planDate], map: "idx_daily_publish_plan_date")
  @@map("daily_publish_plans")
}
```

同时在 `User` model 中添加 relation：
```prisma
dailyPublishPlans DailyPublishPlan[] @relation("UserToDailyPublishPlans")
```

在 `Product` model 中添加 relation：
```prisma
dailyPublishPlans DailyPublishPlan[] @relation("ProductToDailyPublishPlans")
```

- [ ] **Step 2: 提交代码**

```bash
git add prisma/schema.prisma
git commit -m "feat: add DailyPublishPlan model for daily publishing plans

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 创建获取和添加 API 路由

**Files:**
- Create: `app/api/daily-publish-plan/route.ts`

- [ ] **Step 1: 创建 API 路由**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/daily-publish-plan?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')

  if (!dateStr) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'invalid date format' }, { status: 400 })
  }

  // 获取日期范围（当天 00:00:00 到 23:59:59）
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  try {
    const plans = await prisma.dailyPublishPlan.findMany({
      where: {
        userId: session.user.id,
        planDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        product: {
          include: {
            images: {
              where: { isMain: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      plans: plans.map(plan => ({
        id: plan.id,
        productId: plan.productId,
        productName: plan.product.name,
        productImage: plan.product.images[0]?.url || null,
        planDate: plan.planDate.toISOString().split('T')[0],
        createdAt: plan.createdAt.toISOString(),
      })),
      count: plans.length,
    })
  } catch (error) {
    console.error('Failed to fetch daily publish plans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/daily-publish-plan
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, planDate } = body

    if (!productId || !planDate) {
      return NextResponse.json({ error: 'productId and planDate are required' }, { status: 400 })
    }

    const date = new Date(planDate)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'invalid date format' }, { status: 400 })
    }

    // 检查产品是否存在
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 添加到发布计划（使用 upsert 处理重复添加）
    const plan = await prisma.dailyPublishPlan.upsert({
      where: {
        uk_daily_publish_plan_user_product_date: {
          userId: session.user.id,
          productId,
          planDate: date,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        productId,
        planDate: date,
      },
    })

    return NextResponse.json({
      id: plan.id,
      productId: plan.productId,
      planDate: plan.planDate.toISOString().split('T')[0],
      createdAt: plan.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to add to daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/api/daily-publish-plan/route.ts
git commit -m "feat: add daily-publish-plan GET and POST API routes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 创建删除和批量添加 API 路由

**Files:**
- Create: `app/api/daily-publish-plan/[id]/route.ts`
- Create: `app/api/daily-publish-plan/batch/route.ts`

- [ ] **Step 1: 创建删除 API 路由**

```typescript
// app/api/daily-publish-plan/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/daily-publish-plan/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const plan = await prisma.dailyPublishPlan.findUnique({
      where: { id: params.id },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // 验证权限
    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.dailyPublishPlan.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建批量添加 API 路由**

```typescript
// app/api/daily-publish-plan/batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/daily-publish-plan/batch
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productIds, planDate } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds array is required' }, { status: 400 })
    }

    if (!planDate) {
      return NextResponse.json({ error: 'planDate is required' }, { status: 400 })
    }

    const date = new Date(planDate)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'invalid date format' }, { status: 400 })
    }

    const results = {
      added: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const productId of productIds) {
      try {
        // 检查产品是否存在
        const product = await prisma.product.findUnique({
          where: { id: productId },
        })
        if (!product) {
          results.errors.push(`Product ${productId} not found`)
          continue
        }

        // 尝试创建，使用 upsert 处理重复
        await prisma.dailyPublishPlan.upsert({
          where: {
            uk_daily_publish_plan_user_product_date: {
              userId: session.user.id,
              productId,
              planDate: date,
            },
          },
          update: {},
          create: {
            userId: session.user.id,
            productId,
            planDate: date,
          },
        })
        results.added++
      } catch (err) {
        results.skipped++
        console.error(`Failed to add product ${productId}:`, err)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to batch add to daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 提交代码**

```bash
git add app/api/daily-publish-plan/[id]/route.ts app/api/daily-publish-plan/batch/route.ts
git commit -m "feat: add daily-publish-plan delete and batch add API routes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 创建浮窗组件和 Context Provider

**Files:**
- Create: `components/daily-publish-plan/DailyPublishPlanProvider.tsx`
- Create: `components/daily-publish-plan/DailyPublishPlanFloating.tsx`

- [ ] **Step 1: 创建 Context Provider**

```tsx
// components/daily-publish-plan/DailyPublishPlanProvider.tsx
'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

interface ProductInPlan {
  id: string
  productId: string
  productName: string
  productImage: string | null
  planDate: string
  createdAt: string
}

interface DailyPublishPlanContextType {
  plans: ProductInPlan[]
  count: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  addPlan: (productId: string, planDate: string) => Promise<void>
  addPlansBatch: (productIds: string[], planDate: string) => Promise<void>
  removePlan: (id: string) => Promise<void>
  refreshPlans: (date: string) => Promise<void>
}

const DailyPublishPlanContext = createContext<DailyPublishPlanContextType | null>(null)

export function useDailyPublishPlan() {
  const context = useContext(DailyPublishPlanContext)
  if (!context) {
    throw new Error('useDailyPublishPlan must be used within DailyPublishPlanProvider')
  }
  return context
}

function getTodayDateString() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export function DailyPublishPlanProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<ProductInPlan[]>([])
  const [count, setCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const refreshPlans = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/daily-publish-plan?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans)
        setCount(data.count)
      }
    } catch (error) {
      console.error('Failed to fetch daily publish plans:', error)
    }
  }, [])

  useEffect(() => {
    refreshPlans(getTodayDateString())
  }, [refreshPlans])

  const addPlan = useCallback(async (productId: string, planDate: string) => {
    try {
      const res = await fetch('/api/daily-publish-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, planDate }),
      })
      if (res.ok) {
        await refreshPlans(planDate)
      } else {
        const error = await res.json()
        alert(error.error || '添加失败')
      }
    } catch (error) {
      console.error('Failed to add to daily publish plan:', error)
      alert('添加失败')
    }
  }, [refreshPlans])

  const addPlansBatch = useCallback(async (productIds: string[], planDate: string) => {
    try {
      const res = await fetch('/api/daily-publish-plan/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds, planDate }),
      })
      if (res.ok) {
        const result = await res.json()
        await refreshPlans(planDate)
        if (result.skipped > 0) {
          alert(`已添加 ${result.added} 个产品，${result.skipped} 个已存在`)
        } else {
          alert(`已添加 ${result.added} 个产品到发布计划`)
        }
      } else {
        alert('批量添加失败')
      }
    } catch (error) {
      console.error('Failed to batch add to daily publish plan:', error)
      alert('批量添加失败')
    }
  }, [refreshPlans])

  const removePlan = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/daily-publish-plan/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.id !== id))
        setCount(prev => Math.max(0, prev - 1))
      } else {
        alert('移除失败')
      }
    } catch (error) {
      console.error('Failed to remove from daily publish plan:', error)
      alert('移除失败')
    }
  }, [])

  return (
    <DailyPublishPlanContext.Provider value={{
      plans,
      count,
      isOpen,
      setIsOpen,
      addPlan,
      addPlansBatch,
      removePlan,
      refreshPlans,
    }}>
      {children}
    </DailyPublishPlanContext.Provider>
  )
}
```

- [ ] **Step 2: 创建浮窗组件**

```tsx
// components/daily-publish-plan/DailyPublishPlanFloating.tsx
'use client'

import { useDailyPublishPlan } from './DailyPublishPlanProvider'
import { getImageUrl } from '@/foundation/lib/utils'
import Link from 'next/link'

export function DailyPublishPlanFloating() {
  const { plans, count, isOpen, setIsOpen, removePlan } = useDailyPublishPlan()

  return (
    <>
      {/* 浮窗按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* 浮窗面板 */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-h-96 overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* 标题 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-600">
            <h3 className="text-white font-semibold">当日发布计划</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 产品列表 */}
          <div className="max-h-64 overflow-y-auto">
            {plans.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                暂无产品
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {plans.map(plan => (
                  <div key={plan.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      {plan.productImage ? (
                        <img
                          src={getImageUrl(plan.productImage)}
                          alt={plan.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                          无图
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {plan.productName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(plan.planDate).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <button
                      onClick={() => removePlan(plan.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部链接 */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <Link
              href="/daily-publish-plan"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              查看发布计划
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: 提交代码**

```bash
git add components/daily-publish-plan/DailyPublishPlanProvider.tsx components/daily-publish-plan/DailyPublishPlanFloating.tsx
git commit -m "feat: add daily publish plan floating cart component

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 在 Layout 中添加 Provider 和浮窗

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: 在 Layout 中添加 Provider 和浮窗**

首先读取 `app/(app)/layout.tsx` 了解当前结构。

然后在布局中添加：
1. 导入 `DailyPublishPlanProvider`
2. 导入 `DailyPublishPlanFloating`
3. 用 `DailyPublishPlanProvider` 包裹 children
4. 在底部添加 `DailyPublishPlanFloating`

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/layout.tsx
git commit -m "feat: integrate daily publish plan provider and floating cart

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 在产品详情页添加"加入发布计划"按钮

**Files:**
- Modify: `app/(app)/products/[id]/ProductDetail.tsx`

- [ ] **Step 1: 添加"加入发布计划"按钮**

在 `ProductDetail.tsx` 中：

1. 导入 `useDailyPublishPlan` hook：
```tsx
import { useDailyPublishPlan } from '@/components/daily-publish-plan/DailyPublishPlanProvider'
```

2. 在组件内获取 context：
```tsx
const { addPlan } = useDailyPublishPlan()
```

3. 添加状态和 handler：
```tsx
const [isAdding, setIsAdding] = useState(false)

const handleAddToPublishPlan = async () => {
  setIsAdding(true)
  try {
    await addPlan(product.id, new Date().toISOString().split('T')[0])
  } finally {
    setIsAdding(false)
  }
}
```

4. 在按钮组（生成视频、生图向导、生视频按钮之后）添加：
```tsx
<button
  onClick={handleAddToPublishPlan}
  disabled={isAdding}
  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-500/50 group active:scale-[0.98] disabled:opacity-50"
>
  {isAdding ? (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  )}
  加入发布计划
</button>
```

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/products/[id]/ProductDetail.tsx
git commit -m "feat: add join publish plan button to product detail page

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 在产品列表页添加批量选择和加入功能

**Files:**
- Modify: `app/(app)/products/page.tsx`

- [ ] **Step 1: 添加批量选择功能**

1. 导入 `useDailyPublishPlan` hook：
```tsx
import { useDailyPublishPlan } from '@/components/daily-publish-plan/DailyPublishPlanProvider'
```

2. 添加状态：
```tsx
const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
const { addPlansBatch } = useDailyPublishPlan()
```

3. 添加全选/取消全选和批量添加 handler：
```tsx
const handleSelectAll = () => {
  if (selectedProductIds.size === products.length) {
    setSelectedProductIds(new Set())
  } else {
    setSelectedProductIds(new Set(products.map(p => p.id)))
  }
}

const handleAddSelectedToPublishPlan = async () => {
  if (selectedProductIds.size === 0) return
  const today = new Date().toISOString().split('T')[0]
  await addPlansBatch(Array.from(selectedProductIds), today)
  setSelectedProductIds(new Set())
}
```

4. 在搜索栏下方添加：
- 全选按钮
- 批量添加按钮（当有选中时显示）

```tsx
{selectedProductIds.size > 0 && (
  <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
    <span className="text-sm text-emerald-700">
      已选择 {selectedProductIds.size} 个产品
    </span>
    <button
      onClick={handleSelectAll}
      className="text-sm text-emerald-600 hover:text-emerald-700 underline"
    >
      {selectedProductIds.size === products.length ? '取消全选' : '全选'}
    </button>
    <button
      onClick={handleAddSelectedToPublishPlan}
      className="ml-auto px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
    >
      加入发布计划
    </button>
  </div>
)}
```

5. 在产品卡片上添加选择框（点击卡片也可以切换选择）：
```tsx
<div
  key={product.id}
  className="animate-in"
  style={{
    animationDuration: '500ms',
    animationDelay: `${index * 50}ms`,
    animationFillMode: 'backwards',
  }}
  onClick={() => {
    const next = new Set(selectedProductIds)
    if (next.has(product.id)) {
      next.delete(product.id)
    } else {
      next.add(product.id)
    }
    setSelectedProductIds(next)
  }}
>
  <ProductCard
    product={product as any}
    selected={selectedProductIds.has(product.id)}
  />
</div>
```

6. 如果 ProductCard 组件不支持 selected prop，需要先添加该支持。

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/products/page.tsx
git commit -m "feat: add batch selection and join publish plan to product list page

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 给 ProductCard 添加 selected 状态支持（如果需要）

**Files:**
- Modify: `components/product/ProductCard.tsx`

- [ ] **Step 1: 添加 selected prop 支持**

读取 `components/product/ProductCard.tsx`，然后添加 `selected` prop：

```tsx
interface ProductCardProps {
  product: {
    id: string
    name: string
    targetAudience: 'MENS' | 'WOMENS' | 'KIDS'
    tags: string | null
    images: { url: string; isMain: boolean }[]
    createdAt: string
  }
  selected?: boolean
}
```

在组件根元素上添加选中样式：
```tsx
className={`relative animate-in ${selected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
```

同时添加选中角标：
```tsx
{selected && (
  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  </div>
)}
```

- [ ] **Step 2: 提交代码**

```bash
git add components/product/ProductCard.tsx
git commit -m "feat: add selected state support to ProductCard

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 验证步骤

1. 运行数据库迁移 `npx prisma db push`
2. 启动开发服务器 `npm run dev`
3. 访问产品列表页 `/products`
4. 选择产品，点击"加入发布计划"
5. 检查右下角浮窗是否显示已选产品
6. 点击浮窗展开，查看产品列表
7. 移除产品，验证功能
8. 访问产品详情页，测试单个添加功能
