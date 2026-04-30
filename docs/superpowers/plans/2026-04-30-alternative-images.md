# 备选图功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现备选图功能，记录所有生成的图片/视频，用户可选择确认最终使用哪张

**Architecture:**
- 新建 `alternative_images` 表存储备选图
- 创建 CRUD API 处理备选图
- 在上传和 AI 生成流程中写入备选表
- 前端展示备选图列表和确认功能

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma

---

## 文件结构

```
新建:
- prisma/schema.prisma                           # 添加 AlternativeImage model
- app/api/alternative-images/route.ts            # GET/POST API
- app/api/alternative-images/[id]/route.ts      # DELETE API
- app/api/alternative-images/[id]/confirm/route.ts  # 确认 API

修改:
- app/(app)/products/[id]/ProductDetail.tsx     # 素材 Tab 显示备选图
```

---

## Task 1: 更新 Prisma Schema 添加 AlternativeImage Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 添加 AlternativeImage Model**

在 `prisma/schema.prisma` 末尾（`VirtualIpScene` model 之后）添加：

```prisma
model AlternativeImage {
  id            String           @id @default(uuid()) @db.VarChar(36)
  materialType  AlternativeType
  relatedId     String           @map("related_id") @db.VarChar(36)
  url           String           @db.VarChar(500)
  source        AlternativeSource
  isConfirmed   Boolean          @default(false) @map("is_confirmed")
  createdAt     DateTime         @default(now()) @map("created_at")

  @@index([relatedId], map: "idx_alternative_images_related")
  @@index([materialType], map: "idx_alternative_images_type")
  @@index([isConfirmed], map: "idx_alternative_images_confirmed")
  @@map("alternative_images")
}

enum AlternativeType {
  MODEL_IMAGE
  STYLE_IMAGE
  FIRST_FRAME
  VIDEO
}

enum AlternativeSource {
  AI_GENERATED
  USER_UPLOADED
}
```

- [ ] **Step 2: 提交代码**

```bash
git add prisma/schema.prisma
git commit -m "feat: add AlternativeImage model for alternative images

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 创建获取和添加备选图 API

**Files:**
- Create: `app/api/alternative-images/route.ts`

- [ ] **Step 1: 创建 API 路由**

```typescript
// app/api/alternative-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/alternative-images?materialType=FIRST_FRAME&relatedId=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const materialType = searchParams.get('materialType')
  const relatedId = searchParams.get('relatedId')

  if (!materialType || !relatedId) {
    return NextResponse.json(
      { error: 'materialType and relatedId are required' },
      { status: 400 }
    )
  }

  try {
    const alternatives = await db.alternativeImage.findMany({
      where: {
        materialType: materialType as any,
        relatedId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ alternatives })
  } catch (error) {
    console.error('Failed to fetch alternative images:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/alternative-images
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { materialType, relatedId, url, source } = body

    if (!materialType || !relatedId || !url || !source) {
      return NextResponse.json(
        { error: 'materialType, relatedId, url, source are required' },
        { status: 400 }
      )
    }

    const alternative = await db.alternativeImage.create({
      data: {
        materialType,
        relatedId,
        url,
        source,
        isConfirmed: source === 'USER_UPLOADED', // 用户上传自动确认
      },
    })

    return NextResponse.json(alternative)
  } catch (error) {
    console.error('Failed to create alternative image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/api/alternative-images/route.ts
git commit -m "feat: add alternative-images GET and POST API routes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 创建删除和确认 API

**Files:**
- Create: `app/api/alternative-images/[id]/route.ts`
- Create: `app/api/alternative-images/[id]/confirm/route.ts`

- [ ] **Step 1: 创建删除 API**

```typescript
// app/api/alternative-images/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// DELETE /api/alternative-images/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const alternative = await db.alternativeImage.findUnique({
      where: { id: params.id },
    })

    if (!alternative) {
      return NextResponse.json({ error: 'Alternative not found' }, { status: 404 })
    }

    await db.alternativeImage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete alternative image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建确认 API**

```typescript
// app/api/alternative-images/[id]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// POST /api/alternative-images/:id/confirm
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const alternative = await db.alternativeImage.findUnique({
      where: { id: params.id },
    })

    if (!alternative) {
      return NextResponse.json({ error: 'Alternative not found' }, { status: 404 })
    }

    // 更新正式记录的 URL
    switch (alternative.materialType) {
      case 'FIRST_FRAME':
        await db.firstFrame.update({
          where: { id: alternative.relatedId },
          data: { url: alternative.url },
        })
        break
      case 'MODEL_IMAGE':
        await db.modelImage.update({
          where: { id: alternative.relatedId },
          data: { url: alternative.url },
        })
        break
      case 'STYLE_IMAGE':
        await db.styleImage.update({
          where: { id: alternative.relatedId },
          data: { url: alternative.url },
        })
        break
      case 'VIDEO':
        await db.video.update({
          where: { id: alternative.relatedId },
          data: { url: alternative.url },
        })
        break
    }

    // 标记该备选为已确认
    await db.alternativeImage.update({
      where: { id: params.id },
      data: { isConfirmed: true },
    })

    return NextResponse.json({
      success: true,
      confirmedUrl: alternative.url,
    })
  } catch (error) {
    console.error('Failed to confirm alternative image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 提交代码**

```bash
git add app/api/alternative-images/[id]/route.ts app/api/alternative-images/[id]/confirm/route.ts
git commit -m "feat: add alternative-images delete and confirm API routes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 修改上传流程写入备选图

**Files:**
- Modify: `app/(app)/products/[id]/ProductDetail.tsx` (SecondaryImagesSection)

- [ ] **Step 1: 在用户上传后同时创建备选记录**

找到 `SecondaryImagesSection` 组件中的 `handleUpload` 函数，修改为：

```typescript
const handleUpload = async (file: File) => {
  setUploading(true)
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()

    // 1. 保存产品图片
    const res2 = await fetch(`/api/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: data.url }),
    })
    if (!res2.ok) throw new Error('Failed to save image')
    const newImage = await res2.json()
    setSecondaryImages(prev => [...prev, newImage])

    // 2. 如果是主图，创建备选记录（关联 first_frames）
    const mainImage = product.images?.find((img: any) => img.isMain)
    if (mainImage) {
      // 查找对应的 first_frame 记录
      const ffRes = await fetch(`/api/products/${productId}/first-frames?mainImageUrl=${mainImage.url}`)
      if (ffRes.ok) {
        const ffs = await ffRes.json()
        if (ffs.length > 0) {
          // 创建备选记录
          await fetch('/api/alternative-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              materialType: 'FIRST_FRAME',
              relatedId: ffs[0].id,
              url: data.url,
              source: 'USER_UPLOADED',
            }),
          })
        }
      }
    }
  } catch (err) {
    console.error(err)
    alert('上传失败')
  } finally {
    setUploading(false)
  }
}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/products/[id]/ProductDetail.tsx
git commit -m "feat: create alternative image on user upload

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 修改 AI 生成流程写入备选图

**Files:**
- Modify: `app/api/tools/combination/generate/route.ts`

- [ ] **Step 1: 在生成成功后创建备选记录**

在 `generate` API 中，AI 生成成功后调用创建备选图的逻辑。需要在生成成功后：

```typescript
// 生成成功后，创建备选记录
async function createAlternativeImage(
  materialType: 'FIRST_FRAME' | 'MODEL_IMAGE' | 'STYLE_IMAGE',
  relatedId: string,
  url: string
) {
  await db.alternativeImage.create({
    data: {
      materialType,
      relatedId,
      url,
      source: 'AI_GENERATED',
      isConfirmed: false,
    },
  })
}
```

在各个生成类型的处理分支中，生成成功后调用 `createAlternativeImage`。

- [ ] **Step 2: 提交代码**

```bash
git add app/api/tools/combination/generate/route.ts
git commit -m "feat: create alternative image on AI generation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 在素材 Tab 显示备选图和确认功能

**Files:**
- Modify: `app/(app)/products/[id]/ProductDetail.tsx` (MaterialsTab)

- [ ] **Step 1: 添加备选图展示**

在 `MaterialsTab` 组件中：

1. 添加获取备选图的状态和函数
2. 在首帧图区域下方添加"查看备选"按钮和备选图列表
3. 添加确认选择功能

```tsx
// 状态
const [alternatives, setAlternatives] = useState<AlternativeImage[]>([])
const [showAlternatives, setShowAlternatives] = useState(false)

// 获取备选图
const fetchAlternatives = async (firstFrameId: string) => {
  const res = await fetch(`/api/alternative-images?materialType=FIRST_FRAME&relatedId=${firstFrameId}`)
  if (res.ok) {
    const data = await res.json()
    setAlternatives(data.alternatives)
  }
}

// 确认选择
const handleConfirmAlternative = async (alternativeId: string) => {
  try {
    const res = await fetch(`/api/alternative-images/${alternativeId}/confirm`, {
      method: 'POST',
    })
    if (res.ok) {
      // 刷新数据和备选列表
      fetchGeneratedMaterials()
      // 刷新当前首帧的备选
      const ff = materials.firstFrames[0]?.id
      if (ff) fetchAlternatives(ff)
    }
  } catch (err) {
    console.error(err)
    alert('确认失败')
  }
}
```

2. 在首帧图区域添加备选图展示：

```tsx
{/* 首帧图 */}
{materials.firstFrames.length > 0 && (
  <div>
    <h3 className="text-sm font-medium text-gray-500 mb-4">
      首帧图 ({materials.firstFrames.length})
      {alternatives.length > 0 && (
        <button
          onClick={() => setShowAlternatives(!showAlternatives)}
          className="ml-2 text-xs text-violet-600 hover:text-violet-700 underline"
        >
          {showAlternatives ? '收起' : `+ 备选图 (${alternatives.length})`}
        </button>
      )}
    </h3>
    <div className="grid grid-cols-2 justify-items-start gap-3 md:grid-cols-3 lg:grid-cols-4">
      {materials.firstFrames.map(f => (
        <div key={f.id} className="relative group aspect-[9/16] w-full max-w-36">
          <img src={getImageUrl(f.url)} alt="首帧图" ... />
        </div>
      ))}
    </div>

    {/* 备选图列表 */}
    {showAlternatives && alternatives.length > 0 && (
      <div className="mt-4">
        <p className="text-xs text-gray-400 mb-2">备选图</p>
        <div className="flex flex-wrap gap-2">
          {alternatives.map(alt => (
            <div key={alt.id} className="relative">
              <img
                src={getImageUrl(alt.url)}
                alt="备选图"
                className="h-20 w-20 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-violet-500"
                onClick={() => handleConfirmAlternative(alt.id)}
              />
              {alt.isConfirmed && (
                <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">✓</span>
              )}
              {alt.source === 'AI_GENERATED' && (
                <span className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1 rounded">AI</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2: 提交代码**

```bash
git add app/(app)/products/[id]/ProductDetail.tsx
git commit -m "feat: display alternative images in materials tab

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 验证步骤

1. 运行数据库迁移 `npx prisma db push`
2. 启动开发服务器 `npm run dev`
3. 访问产品详情页 `/products/[id]`
4. 在素材 Tab 查看首帧图
5. 测试上传图片，确认备选表中新增记录
6. 测试 AI 生成，确认备选表中新增记录
7. 点击备选图确认选择，验证正式记录 URL 被更新
