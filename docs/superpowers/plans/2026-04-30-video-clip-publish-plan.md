# 视频剪辑和发布实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现视频剪辑和发布功能，通过 cap_cut CLI 对产品下 AI 视频批量剪辑，生成可发布视频

**Architecture:**
- 新增 VideoPush 表存储剪辑后视频
- 扩展 MaterialType 枚举添加 CLIP_TEMPLATE, BACKGROUND_MUSIC, COVER_TEMPLATE
- cap_cut 作为本地 CLI 调用，异步执行
- 每日发布计划页面展示产品视频统计和操作按钮

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma

---

## 文件结构

```
新建:
- prisma/schema.prisma                           # VideoPush model, MaterialType 扩展
- foundation/providers/CapcutCliProvider.ts     # cap_cut CLI 调用封装
- app/api/video-push/route.ts                   # GET list, POST clip
- app/api/video-push/[id]/route.ts              # PATCH qualify, DELETE
- app/(app)/daily-publish-plan/page.tsx         # 每日发布计划页面

修改:
- app/(app)/products/[id]/ProductDetail.tsx    # 添加视频管理 Tab (可选)
```

---

## Task 1: 更新 Prisma Schema 添加 VideoPush Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 扩展 MaterialType 枚举**

找到 `enum MaterialType` 并添加新的类型值：

```prisma
enum MaterialType {
  SCENE
  POSE
  MAKEUP
  ACCESSORY
  CLIP_TEMPLATE      // 剪辑模板
  BACKGROUND_MUSIC  // 背景音乐
  COVER_TEMPLATE     // 封面模板
  OTHER
}
```

- [ ] **Step 2: 添加 VideoPush Model**

在 `model AlternativeImage` 之后添加：

```prisma
model VideoPush {
  id              String   @id @default(uuid()) @db.VarChar(36)
  videoId         String   @map("video_id") @db.VarChar(36)   // 来源AI视频ID
  productId       String   @map("product_id") @db.VarChar(36)
  ipId            String   @map("ip_id") @db.VarChar(36)
  templateId      String?  @map("template_id")                 // cap_cut返回的模板标识
  templateName   String?  @map("template_name")              // 模板名称
  musicId         String?  @map("music_id")                   // 随机选中的背景音乐
  url             String   @db.VarChar(500)
  thumbnail       String?  @db.VarChar(500)
  title           String?  @db.VarChar(200)
  description     String?  @db.Text
  clipParams      String?  @db.Text                           // cap_cut返回的原始参数JSON
  isQualified     Boolean  @default(false) @map("is_qualified")
  isPublished     Boolean  @default(false) @map("is_published")
  createdAt       DateTime @default(now()) @map("created_at")

  product         Product  @relation(fields: [productId], references: [id])
  @@index([productId], map: "idx_video_push_product")
  @@index([isQualified], map: "idx_video_push_qualified")
  @@map("video_pushes")
}
```

- [ ] **Step 3: 提交代码**

```bash
git add prisma/schema.prisma
git commit -m "feat: add VideoPush model and MaterialType extensions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 创建 CapcutCliProvider CLI 调用封装

**Files:**
- Create: `foundation/providers/CapcutCliProvider.ts`

- [ ] **Step 1: 创建 CapcutCliProvider 类**

参考 JimengCliProvider 的模式创建：

```typescript
// foundation/providers/CapcutCliProvider.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export interface CapcutCliConfig {
  capcutPath?: string  // cap_cut CLI 路径
  outputBaseUrl?: string  // 视频 URL 前缀
}

export interface CapcutClipInput {
  videoUrls: string[]   // AI 视频 URL 列表
  musicUrl?: string     // 背景音乐 URL（可选）
}

export interface CapcutClipResult {
  success: boolean
  clips?: CapcutClip[]
  error?: string
}

export interface CapcutClip {
  template: string
  templateId: string
  url: string
  thumbnail: string
  params: Record<string, any>
  duration?: number
  size?: number
}

export class CapcutCliProvider {
  providerName = 'capcut'
  private config: CapcutCliConfig
  private tmpDir: string

  constructor(config: CapcutCliConfig = {}) {
    this.config = {
      capcutPath: 'cap_cut',
      outputBaseUrl: 'http://localhost:3000/videos',
      ...config,
    }
    this.tmpDir = path.join(os.tmpdir(), 'capcut-cli')
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true })
    }
  }

  /**
   * 下载视频到临时文件
   */
  private async downloadVideo(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`
    const filepath = path.join(this.tmpDir, filename)
    fs.writeFileSync(filepath, Buffer.from(buffer))
    return filepath
  }

  /**
   * 下载音乐到临时文件
   */
  private async downloadMusic(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download music: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
    const filepath = path.join(this.tmpDir, filename)
    fs.writeFileSync(filepath, Buffer.from(buffer))
    return filepath
  }

  /**
   * 调用 cap_cut clip 命令
   */
  async clip(input: CapcutClipInput): Promise<CapcutClipResult> {
    try {
      // 下载所有视频到临时文件
      const videoPaths = await Promise.all(
        input.videoUrls.map(url => this.downloadVideo(url))
      )

      // 下载音乐（如果有）
      let musicPath: string | undefined
      if (input.musicUrl) {
        musicPath = await this.downloadMusic(input.musicUrl)
      }

      // 构建命令
      const args = [
        'clip',
        '--videos', videoPaths.join(','),
        '--output', this.tmpDir,
      ]

      if (musicPath) {
        args.push('--music', musicPath)
      }

      const command = `${this.config.capcutPath} ${args.join(' ')}`
      console.log('[CapcutCli] Executing:', command)

      // cap_cut 可能会执行较长时间，设置较长超时
      const { stdout, stderr } = await execAsync(command, { timeout: 600000 })

      if (stderr) {
        console.warn('[CapcutCli] stderr:', stderr)
      }

      // 解析 JSON 输出
      const jsonMatch = stdout.match(/\{[\s\S]*"clips"[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        // 转换本地路径为 URL
        return {
          success: true,
          clips: result.clips?.map((clip: CapcutClip) => ({
            ...clip,
            url: this.convertToUrl(clip.url),
            thumbnail: this.convertToUrl(clip.thumbnail),
          })),
        }
      }

      return { success: false, error: 'No JSON output found' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 转换本地路径为可访问的 URL
   */
  private convertToUrl(localPath: string): string {
    // 移除本地路径前缀，替换为 URL 前缀
    const relativePath = localPath.replace(/^[A-Z]:\\|^\//, '')
    return `${this.config.outputBaseUrl}/${relativePath}`
  }
}

// 导出单例
let capcutProvider: CapcutCliProvider | null = null

export function getCapcutProvider(): CapcutCliProvider {
  if (!capcutProvider) {
    capcutProvider = new CapcutCliProvider()
  }
  return capcutProvider
}
```

- [ ] **Step 2: 提交代码**

```bash
git add foundation/providers/CapcutCliProvider.ts
git commit -m "feat: add CapcutCliProvider for cap_cut CLI integration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 创建 VideoPush API 路由

**Files:**
- Create: `app/api/video-push/route.ts`

- [ ] **Step 1: 创建 VideoPush GET 和 POST clip API**

```typescript
// app/api/video-push/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { getCapcutProvider } from '@/foundation/providers/CapcutCliProvider'

export const dynamic = 'force-dynamic'

// GET /api/video-push?productId=xxx&qualified=true
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const qualified = searchParams.get('qualified')

  try {
    const where: any = {
      product: { teamId: session.user.teamId },
    }
    if (productId) where.productId = productId
    if (qualified === 'true') where.isQualified = true

    const videos = await db.videoPush.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Failed to fetch video push:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/video-push/clip
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // 1. 查询该产品的所有 AI 视频
    const videos = await db.video.findMany({
      where: {
        productId,
        teamId: session.user.teamId,
      },
      select: {
        id: true,
        url: true,
        ipId: true,
      },
    })

    if (videos.length === 0) {
      return NextResponse.json({ error: 'No AI videos found for this product' }, { status: 400 })
    }

    // 2. 随机选择一条背景音乐
    const music = await db.material.findFirst({
      where: {
        teamId: session.user.teamId,
        type: 'BACKGROUND_MUSIC',
      },
      orderBy: { createdAt: 'desc' },
    })

    // 3. 调用 cap_cut CLI
    const capcut = getCapcutProvider()
    const result = await capcut.clip({
      videoUrls: videos.map(v => v.url),
      musicUrl: music?.url,
    })

    if (!result.success || !result.clips) {
      return NextResponse.json({ error: result.error || 'Clip failed' }, { status: 500 })
    }

    // 4. 保存结果到 VideoPush 表
    const videoPushes = await Promise.all(
      result.clips.map(clip =>
        db.videoPush.create({
          data: {
            videoId: videos[0].id,  // 关联第一个 AI 视频
            productId,
            ipId: videos[0].ipId,
            templateId: clip.templateId,
            templateName: clip.template,
            musicId: music?.id,
            url: clip.url,
            thumbnail: clip.thumbnail,
            clipParams: JSON.stringify(clip.params),
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: `Created ${videoPushes.length} clips`,
      videos: videoPushes,
    })
  } catch (error) {
    console.error('Failed to clip:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/api/video-push/route.ts
git commit -m "feat: add video-push GET and clip API routes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 创建 VideoPush 单条操作 API

**Files:**
- Create: `app/api/video-push/[id]/route.ts`
- Create: `app/api/video-push/[id]/publish/route.ts`

- [ ] **Step 1: 创建 PATCH 和 DELETE API**

```typescript
// app/api/video-push/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/video-push/:id - 标记是否达标
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { qualified, published } = body

    const updateData: any = {}
    if (typeof qualified === 'boolean') updateData.isQualified = qualified
    if (typeof published === 'boolean') updateData.isPublished = published

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const videoPush = await db.videoPush.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(videoPush)
  } catch (error) {
    console.error('Failed to update video push:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/video-push/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await db.videoPush.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete video push:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建 publish API**

```typescript
// app/api/video-push/[id]/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/video-push/:id/publish - 标记已发布
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const videoPush = await db.videoPush.update({
      where: { id: params.id },
      data: { isPublished: true },
    })

    return NextResponse.json({
      success: true,
      videoPush,
    })
  } catch (error) {
    console.error('Failed to publish video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 提交代码**

```bash
git add app/api/video-push/[id]/route.ts app/api/video-push/[id]/publish/route.ts
git commit -m "feat: add video-push PATCH, DELETE and publish API routes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 创建每日发布计划页面

**Files:**
- Create: `app/(app)/daily-publish-plan/page.tsx`

- [ ] **Step 1: 创建每日发布计划页面**

```tsx
// app/(app)/daily-publish-plan/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface ProductStats {
  productId: string
  productName: string
  productImage: string
  ipId: string
  aiVideoCount: number
  pushableCount: number
  publishedCount: number
}

export default function DailyPublishPlanPage() {
  const { data: session } = useSession()
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [products, setProducts] = useState<ProductStats[]>([])
  const [loading, setLoading] = useState(false)
  const [clippingProductId, setClippingProductId] = useState<string | null>(null)

  // 获取产品列表和统计
  const fetchProducts = async () => {
    if (!selectedDate) return
    setLoading(true)
    try {
      const res = await fetch(`/api/daily-publish-plan/${selectedDate}/products`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [selectedDate])

  // 执行剪辑
  const handleClip = async (productId: string, productName: string) => {
    if (!confirm(`确定对 ${productName} 执行剪辑？将使用随机背景音乐。`)) {
      return
    }

    setClippingProductId(productId)
    try {
      const res = await fetch('/api/video-push/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`剪辑任务已提交，创建了 ${data.videos?.length || 0} 个视频`)
        fetchProducts() // 刷新列表
      } else {
        const err = await res.json()
        alert(`剪辑失败: ${err.error}`)
      }
    } catch (err) {
      console.error(err)
      alert('剪辑失败')
    } finally {
      setClippingProductId(null)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">当日发布计划</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>暂无产品</p>
          <p className="text-sm mt-2">在产品详情页添加产品到当日发布计划</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(product => (
            <div
              key={product.productId}
              className="border rounded-lg p-4 flex items-center gap-4"
            >
              <img
                src={product.productImage}
                alt={product.productName}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-medium">{product.productName}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  AI视频: {product.aiVideoCount} | 可发布: {product.pushableCount} | 已发布: {product.publishedCount}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleClip(product.productId, product.productName)}
                  disabled={clippingProductId === product.productId}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {clippingProductId === product.productId ? '剪辑中...' : '剪辑'}
                </button>
                <Link
                  href={`/products/${product.productId}`}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  查看
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建当日发布计划产品列表 API**

需要先添加这个 API：

```typescript
// app/api/daily-publish-plan/[date]/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

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

    // 获取当日发布计划的产品
    const plans = await db.dailyPublishPlan.findMany({
      where: {
        userId: session.user.id,
        planDate: date,
      },
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
            videos: true,
          },
        },
      },
    })

    const products = await Promise.all(
      plans.map(async plan => {
        // 统计该产品的视频
        const aiVideoCount = plan.product.videos.length
        const pushableCount = await db.videoPush.count({
          where: {
            productId: plan.productId,
            isQualified: true,
            isPublished: false,
          },
        })
        const publishedCount = await db.videoPush.count({
          where: {
            productId: plan.productId,
            isPublished: true,
          },
        })

        // 获取该产品的第一个 AI 视频的 ipId
        const firstVideo = plan.product.videos[0]
        const ipId = firstVideo?.ipId || ''

        return {
          productId: plan.productId,
          productName: plan.product.name,
          productImage: plan.product.images[0]?.url || '',
          ipId,
          aiVideoCount,
          pushableCount,
          publishedCount,
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

- [ ] **Step 3: 提交代码**

```bash
git add app/\(app\)/daily-publish-plan/page.tsx app/api/daily-publish-plan/\[date\]/products/route.ts
git commit -m "feat: add daily publish plan page and products API

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 验证步骤

1. 运行数据库迁移 `npx prisma db push`
2. 启动开发服务器 `npm run dev`
3. 访问每日发布计划页面 `/daily-publish-plan`
4. 添加产品到当日发布计划
5. 点击产品「剪辑」按钮，验证 cap_cut 调用和 VideoPush 记录创建
6. 查看可发布视频列表
7. 测试标记发布状态
