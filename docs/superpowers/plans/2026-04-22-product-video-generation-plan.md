# 产品生成视频功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现从产品库生成带货视频的完整流程，包括数据模型、工具定义、API 和 UI 向导。

**Architecture:**
1. 扩展 Prisma schema 添加 product_materials、movement_materials 表，更新 videos 表增加 productId
2. 创建新的工具定义文件（双图编辑、场景替换、图生视频、动作迁移）
3. 创建产品视频生成服务，封装工作流逻辑
4. 实现 API 路由处理生成请求
5. 在产品详情页添加"生成视频"向导 UI

**Tech Stack:** Next.js App Router, Prisma, MySQL, RunningHub API

---

## 文件结构

```
prisma/schema.prisma                          # 数据库 schema 更新
domains/product-material/types.ts             # 新建：product_material 类型
domains/product-material/service.ts           # 新建：product_material 服务
domains/movement-material/types.ts            # 新建：movement_material 类型
domains/movement-material/service.ts          # 新建：movement_material 服务
domains/video-generation/types.ts              # 新建：视频生成工作流类型
domains/video-generation/service.ts            # 新建：视频生成工作流服务
domains/video-generation/tools/image-blend.ts  # 新建：双图编辑工具
domains/video-generation/tools/scene-replace.ts # 新建：场景替换工具
domains/video-generation/tools/image-to-video.ts # 新建：图生视频工具
domains/video-generation/tools/motion-transfer.ts # 新建：动作迁移工具
app/api/products/[id]/generate-video/route.ts # 新建：生成视频 API
app/api/products/[id]/materials/route.ts      # 新建：产品素材 API
app/(app)/products/[id]/GenerateVideoWizard.tsx # 新建：生成视频向导组件
app/(app)/products/[id]/page.tsx              # 修改：添加生成视频入口
```

---

## Task 1: 数据库迁移

**Files:**
- Modify: `prisma/schema.prisma:126-191` (materials 表类型更新)
- Modify: `prisma/schema.prisma:251-281` (products 表关系更新)
- Modify: `prisma/schema.prisma:283-302` (videos 表增加 productId)
- Create: `prisma/migrations/xxx_add_product_materials_movement_materials.sql` (手动 SQL 迁移文件)

- [ ] **Step 1: 更新 prisma schema - 添加 POSE 类型到 MaterialType 枚举**

```prisma
enum MaterialType {
  CLOTHING
  SCENE
  ACTION
  MAKEUP
  ACCESSORY
  OTHER
  POSE  // 新增
}
```

- [ ] **Step 2: 更新 prisma schema - Product 模型添加 productMaterials 关系**

```prisma
model Product {
  // ... existing fields
  productMaterials ProductMaterial[] @relation("ProductToProductMaterials")
}
```

- [ ] **Step 3: 更新 prisma schema - Video 模型添加 productId 字段**

```prisma
model Video {
  // ... existing fields
  productId  String?  @map("product_id")
  product    Product? @relation("ProductToVideos", fields: [productId], references: [id], onDelete: SetNull)
}
```

- [ ] **Step 4: 新建 ProductMaterial 模型**

```prisma
model ProductMaterial {
  id            String   @id @default(uuid())
  productId     String   @map("product_id")
  ipId          String?  @map("ip_id")
  sceneId       String?  @map("scene_id")
  poseId        String?  @map("pose_id")
  fullBodyUrl   String?  @map("full_body_url")
  threeViewUrl  String?  @map("three_view_url")
  nineViewUrl   String?  @map("nine_view_url")
  firstFrameUrl String?  @map("first_frame_url")
  createdAt     DateTime @default(now()) @map("created_at")

  product Product    @relation("ProductToProductMaterials", fields: [productId], references: [id], onDelete: Cascade)
  ip      VirtualIp? @relation("ProductMaterialToVirtualIp", fields: [ipId], references: [id], onDelete: SetNull)
  scene   Material?  @relation("ProductMaterialToScene", fields: [sceneId], references: [id], onDelete: SetNull)
  pose    Material?  @relation("ProductMaterialToPose", fields: [poseId], references: [id], onDelete: SetNull)

  @@map("product_materials")
}
```

- [ ] **Step 5: 新建 MovementMaterial 模型**

```prisma
model MovementMaterial {
  id        String   @id @default(uuid())
  url       String?  @db.VarChar(500)
  content   String   @db.Text
  clothing  String?  @db.Text
  scope     String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  @@map("movement_materials")
}
```

- [ ] **Step 6: 添加 ProductMaterial 到 Product 模型的 relation**

```prisma
// 在 Product 模型中添加
productMaterials ProductMaterial[] @relation("ProductToProductMaterials")
```

- [ ] **Step 7: 添加 Video 到 Product 模型的 relation**

```prisma
// 在 Product 模型中添加
videos Video[] @relation("ProductToVideos")
```

- [ ] **Step 8: 添加 VirtualIp 到 ProductMaterial 的 relation**

```prisma
// 在 VirtualIp 模型中添加
productMaterials ProductMaterial[] @relation("ProductMaterialToVirtualIp")
```

- [ ] **Step 9: 添加 Material 到 ProductMaterial 的 scene 和 pose relation**

```prisma
// 在 Material 模型中添加
productMaterialScenes ProductMaterial[] @relation("ProductMaterialToScene")
productMaterialPoses   ProductMaterial[] @relation("ProductMaterialToPose")
```

- [ ] **Step 10: 运行 prisma migrate 生成迁移**

```bash
npx prisma migrate dev --name add_product_materials_movement_materials
```

- [ ] **Step 11: 提交**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add product_materials and movement_materials tables"
```

---

## Task 2: 创建工具定义文件

**Files:**
- Create: `domains/video-generation/tools/image-blend.ts`
- Create: `domains/video-generation/tools/scene-replace.ts`
- Create: `domains/video-generation/tools/image-to-video.ts`
- Create: `domains/video-generation/tools/motion-transfer.ts`
- Create: `domains/video-generation/tools/index.ts`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p domains/video-generation/tools
```

- [ ] **Step 2: 创建双图编辑工具定义 image-blend.ts**

```typescript
// domains/video-generation/tools/image-blend.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const ImageBlendTool: ToolDefinition = {
  id: 'image-blend',
  name: '双图编辑',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_IMAGE_BLEND || 'image-blend-workflow-id',
  inputs: [
    { name: 'imageA', type: 'image', required: true, description: '基础图片' },
    { name: 'imageB', type: 'image', required: true, description: '融合图片' },
    { name: 'prompt', type: 'text', required: true, description: '融合描述，如"给人物穿上指定的服装"' },
  ],
  outputs: [
    { name: 'result', type: 'image', description: '融合后的图片' },
  ],
}
```

- [ ] **Step 3: 创建场景替换工具定义 scene-replace.ts**

```typescript
// domains/video-generation/tools/scene-replace.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const SceneReplaceTool: ToolDefinition = {
  id: 'scene-replace',
  name: '场景替换',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_SCENE_REPLACE || 'scene-replace-workflow-id',
  inputs: [
    { name: 'character', type: 'image', required: true, description: '人物效果图' },
    { name: 'scene', type: 'image', required: true, description: '场景/构图图片' },
  ],
  outputs: [
    { name: 'firstFrame', type: 'image', description: '首帧图（人物融入构图）' },
  ],
}
```

- [ ] **Step 4: 创建图生视频工具定义 image-to-video.ts**

```typescript
// domains/video-generation/tools/image-to-video.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const ImageToVideoTool: ToolDefinition = {
  id: 'image-to-video',
  name: '图生视频',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_IMAGE_TO_VIDEO || 'image-to-video-workflow-id',
  inputs: [
    { name: 'image', type: 'image', required: true, description: '首帧图' },
    { name: 'actionText', type: 'text', required: true, description: '动作文字描述' },
    { name: 'expression', type: 'text', required: false, description: '表情描述' },
    { name: 'lighting', type: 'text', required: false, description: '光影描述' },
  ],
  outputs: [
    { name: 'video', type: 'video' },
  ],
}
```

- [ ] **Step 5: 创建动作迁移工具定义 motion-transfer.ts**

```typescript
// domains/video-generation/tools/motion-transfer.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const MotionTransferTool: ToolDefinition = {
  id: 'motion-transfer',
  name: '动作迁移',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_MOTION_TRANSFER || 'motion-transfer-workflow-id',
  inputs: [
    { name: 'image', type: 'image', required: true, description: '首帧图' },
    { name: 'actionVideo', type: 'video', required: true, description: '动作视频' },
  ],
  outputs: [
    { name: 'video', type: 'video' },
  ],
}
```

- [ ] **Step 6: 创建工具导出 index.ts**

```typescript
// domains/video-generation/tools/index.ts
export { ImageBlendTool } from './image-blend'
export { SceneReplaceTool } from './scene-replace'
export { ImageToVideoTool } from './image-to-video'
export { MotionTransferTool } from './motion-transfer'
```

- [ ] **Step 7: 提交**

```bash
git add domains/video-generation/tools/
git commit -m "feat: add video generation tool definitions"
```

---

## Task 3: 创建 product_material 类型和服务

**Files:**
- Create: `domains/product-material/types.ts`
- Create: `domains/product-material/service.ts`

- [ ] **Step 1: 创建 types.ts**

```typescript
// domains/product-material/types.ts
export interface ProductMaterial {
  id: string
  productId: string
  ipId: string | null
  sceneId: string | null
  poseId: string | null
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  firstFrameUrl: string | null
  createdAt: Date
}

export interface CreateProductMaterialInput {
  productId: string
  ipId?: string
  sceneId?: string
  poseId?: string
  fullBodyUrl?: string
  threeViewUrl?: string
  nineViewUrl?: string
  firstFrameUrl?: string
}
```

- [ ] **Step 2: 创建 service.ts**

```typescript
// domains/product-material/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateProductMaterialInput, ProductMaterial } from './types'

export async function createProductMaterial(input: CreateProductMaterialInput): Promise<ProductMaterial> {
  return db.productMaterial.create({
    data: {
      id: uuid(),
      productId: input.productId,
      ipId: input.ipId || null,
      sceneId: input.sceneId || null,
      poseId: input.poseId || null,
      fullBodyUrl: input.fullBodyUrl || null,
      threeViewUrl: input.threeViewUrl || null,
      nineViewUrl: input.nineViewUrl || null,
      firstFrameUrl: input.firstFrameUrl || null,
    },
  })
}

export async function getProductMaterials(productId: string): Promise<ProductMaterial[]> {
  return db.productMaterial.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProductMaterialById(id: string): Promise<ProductMaterial | null> {
  return db.productMaterial.findUnique({
    where: { id },
  })
}

export async function updateProductMaterial(
  id: string,
  input: Partial<CreateProductMaterialInput>
): Promise<ProductMaterial> {
  return db.productMaterial.update({
    where: { id },
    data: input,
  })
}
```

- [ ] **Step 3: 提交**

```bash
git add domains/product-material/
git commit -m "feat: add product_material domain"
```

---

## Task 4: 创建 movement_material 类型和服务

**Files:**
- Create: `domains/movement-material/types.ts`
- Create: `domains/movement-material/service.ts`

- [ ] **Step 1: 创建 types.ts**

```typescript
// domains/movement-material/types.ts
export interface MovementMaterial {
  id: string
  url: string | null
  content: string
  clothing: string | null
  scope: string | null
  createdAt: Date
}

export interface CreateMovementMaterialInput {
  url?: string
  content: string
  clothing?: string
  scope?: string
}
```

- [ ] **Step 2: 创建 service.ts**

```typescript
// domains/movement-material/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateMovementMaterialInput, MovementMaterial } from './types'

export async function createMovementMaterial(input: CreateMovementMaterialInput): Promise<MovementMaterial> {
  return db.movementMaterial.create({
    data: {
      id: uuid(),
      url: input.url || null,
      content: input.content,
      clothing: input.clothing || null,
      scope: input.scope || null,
    },
  })
}

export async function getMovementMaterials(): Promise<MovementMaterial[]> {
  return db.movementMaterial.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getMovementMaterialById(id: string): Promise<MovementMaterial | null> {
  return db.movementMaterial.findUnique({
    where: { id },
  })
}
```

- [ ] **Step 3: 提交**

```bash
git add domains/movement-material/
git commit -m "feat: add movement_material domain"
```

---

## Task 5: 创建视频生成服务

**Files:**
- Create: `domains/video-generation/types.ts`
- Create: `domains/video-generation/service.ts`

- [ ] **Step 1: 创建 types.ts**

```typescript
// domains/video-generation/types.ts
export interface VideoGenerationInput {
  productId: string
  ipId: string
  sceneId: string
  poseId?: string
  makeupId?: string
  movementId: string
  compositionId: string // 构图场景 ID
}

export interface VideoGenerationResult {
  videoId: string
  videoUrl: string
  productMaterialId: string
}

export interface EffectImageGenerationResult {
  fullBodyUrl: string
  productMaterialId: string
}
```

- [ ] **Step 2: 创建 service.ts（第一部分：效果图生成）**

```typescript
// domains/video-generation/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import { providerRegistry } from '@/foundation/providers/registry'
import { ImageBlendTool } from './tools/image-blend'
import { SceneReplaceTool } from './tools/scene-replace'
import { ImageToVideoTool } from './tools/image-to-video'
import { MotionTransferTool } from './tools/motion-transfer'
import { createProductMaterial, updateProductMaterial } from '@/domains/product-material/service'
import { getMovementMaterialById } from '@/domains/movement-material/service'
import type { VideoGenerationInput, VideoGenerationResult, EffectImageGenerationResult } from './types'

/**
 * 生成效果图：人物 + 服装 + 场景 + 妆容
 */
export async function generateEffectImage(
  productId: string,
  ipId: string,
  sceneId: string,
  poseId?: string,
  makeupId?: string
): Promise<EffectImageGenerationResult> {
  // 1. 获取 IP 的人物图
  const ip = await db.virtualIp.findUnique({ where: { id: ipId } })
  if (!ip || !ip.fullBodyUrl) {
    throw new Error('IP or fullBodyUrl not found')
  }

  // 2. 获取产品服装图（主图）
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { images: true },
  })
  if (!product || product.images.length === 0) {
    throw new Error('Product or product images not found')
  }
  const clothingUrl = product.images.find(img => img.isMain)?.url || product.images[0].url

  // 3. 获取场景图
  const scene = await db.material.findUnique({ where: { id: sceneId } })
  if (!scene) {
    throw new Error('Scene not found')
  }

  // 4. 双图编辑：人物 + 服装
  let currentImage = ip.fullBodyUrl
  const blendResult1 = await providerRegistry.execute(ImageBlendTool.workflowId, {
    imageA: currentImage,
    imageB: clothingUrl,
    prompt: '给人物穿上指定的服装，保持人物姿态和面部特征',
  })
  if (blendResult1.error || !blendResult1.outputs?.result) {
    throw new Error('Failed to blend character with clothing')
  }
  currentImage = blendResult1.outputs.result

  // 5. 双图编辑：效果图 + 场景
  const blendResult2 = await providerRegistry.execute(ImageBlendTool.workflowId, {
    imageA: currentImage,
    imageB: scene.url,
    prompt: '将人物融入场景中，保持人物和服装的完整性',
  })
  if (blendResult2.error || !blendResult2.outputs?.result) {
    throw new Error('Failed to blend with scene')
  }
  currentImage = blendResult2.outputs.result

  // 6. 如果有妆容，双图编辑：效果图 + 妆容
  if (makeupId) {
    const makeup = await db.material.findUnique({ where: { id: makeupId } })
    if (makeup) {
      const blendResult3 = await providerRegistry.execute(ImageBlendTool.workflowId, {
        imageA: currentImage,
        imageB: makeup.url,
        prompt: '为人物添加妆容，保持整体效果',
      })
      if (!blendResult3.error && blendResult3.outputs?.result) {
        currentImage = blendResult3.outputs.result
      }
    }
  }

  // 7. 保存到 product_materials
  const productMaterial = await createProductMaterial({
    productId,
    ipId,
    sceneId,
    poseId,
    fullBodyUrl: currentImage,
  })

  return {
    fullBodyUrl: currentImage,
    productMaterialId: productMaterial.id,
  }
}
```

- [ ] **Step 3: 创建 service.ts（第二部分：首帧图生成）**

```typescript
/**
 * 生成首帧图：效果图 + 构图场景
 */
export async function generateFirstFrame(
  productMaterialId: string,
  compositionId: string
): Promise<string> {
  // 1. 获取 product_material
  const productMaterial = await db.productMaterial.findUnique({
    where: { id: productMaterialId },
  })
  if (!productMaterial || !productMaterial.fullBodyUrl) {
    throw new Error('ProductMaterial or fullBodyUrl not found')
  }

  // 2. 获取构图场景图
  const composition = await db.material.findUnique({ where: { id: compositionId } })
  if (!composition) {
    throw new Error('Composition scene not found')
  }

  // 3. 场景替换
  const sceneResult = await providerRegistry.execute(SceneReplaceTool.workflowId, {
    character: productMaterial.fullBodyUrl,
    scene: composition.url,
  })
  if (sceneResult.error || !sceneResult.outputs?.firstFrame) {
    throw new Error('Failed to generate first frame')
  }

  // 4. 更新 product_material
  await updateProductMaterial(productMaterialId, {
    firstFrameUrl: sceneResult.outputs.firstFrame,
  })

  return sceneResult.outputs.firstFrame
}
```

- [ ] **Step 4: 创建 service.ts（第三部分：视频生成）**

```typescript
/**
 * 生成视频
 */
export async function generateVideo(
  productId: string,
  userId: string,
  teamId: string,
  ipId: string,
  firstFrameUrl: string,
  movementId: string
): Promise<VideoGenerationResult> {
  // 1. 获取动作信息
  const movement = await getMovementMaterialById(movementId)
  if (!movement) {
    throw new Error('Movement not found')
  }

  let videoUrl: string
  let taskId = uuid()

  // 2. 根据动作类型选择工具
  if (movement.url) {
    // 视频动作：使用动作迁移工具
    const motionResult = await providerRegistry.execute(MotionTransferTool.workflowId, {
      image: firstFrameUrl,
      actionVideo: movement.url,
    })
    if (motionResult.error || !motionResult.outputs?.video) {
      throw new Error('Failed to generate video with motion transfer')
    }
    videoUrl = motionResult.outputs.video
  } else {
    // 文字动作：使用图生视频工具
    const videoResult = await providerRegistry.execute(ImageToVideoTool.workflowId, {
      image: firstFrameUrl,
      actionText: movement.content,
    })
    if (videoResult.error || !videoResult.outputs?.video) {
      throw new Error('Failed to generate video with image to video')
    }
    videoUrl = videoResult.outputs.video
  }

  // 3. 保存视频记录
  const video = await db.video.create({
    data: {
      id: uuid(),
      taskId,
      userId,
      teamId,
      ipId,
      productId,
      name: `视频_${Date.now()}`,
      url: videoUrl,
    },
  })

  return {
    videoId: video.id,
    videoUrl: video.url,
    productMaterialId: productMaterialId, // 需要传递
  }
}
```

- [ ] **Step 5: 提交**

```bash
git add domains/video-generation/
git commit -m "feat: add video generation service"
```

---

## Task 6: 实现 API 路由

**Files:**
- Create: `app/api/products/[id]/generate-video/route.ts`
- Create: `app/api/products/[id]/materials/route.ts`

- [ ] **Step 1: 创建生成视频 API - GET handler**

```typescript
// app/api/products/[id]/generate-video/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateEffectImage, generateFirstFrame, generateVideo } from '@/domains/video-generation/service'

// GET /api/products/[id]/generate-video
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const step = searchParams.get('step')
    const productId = params.id

    if (step === 'effect-image') {
      const ipId = searchParams.get('ipId')
      const sceneId = searchParams.get('sceneId')
      const poseId = searchParams.get('poseId') || undefined
      const makeupId = searchParams.get('makeupId') || undefined

      if (!ipId || !sceneId) {
        return NextResponse.json({ error: 'ipId and sceneId are required' }, { status: 400 })
      }

      const result = await generateEffectImage(productId, ipId, sceneId, poseId, makeupId)
      return NextResponse.json(result)
    }

    if (step === 'first-frame') {
      const productMaterialId = searchParams.get('productMaterialId')
      const compositionId = searchParams.get('compositionId')

      if (!productMaterialId || !compositionId) {
        return NextResponse.json({ error: 'productMaterialId and compositionId are required' }, { status: 400 })
      }

      const firstFrameUrl = await generateFirstFrame(productMaterialId, compositionId)
      return NextResponse.json({ firstFrameUrl })
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  } catch (error) {
    console.error('Generate video error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 创建生成视频 API - POST handler**

```typescript
// POST /api/products/[id]/generate-video
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const body = await request.json()
    const {
      productMaterialId,
      ipId,
      firstFrameUrl,
      movementId,
    } = body

    if (!productMaterialId || !ipId || !firstFrameUrl || !movementId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await generateVideo(
      params.id,
      session.user.id,
      session.user.teamId,
      ipId,
      firstFrameUrl,
      movementId
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate video error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: 创建产品素材 API - GET handler**

```typescript
// app/api/products/[id]/materials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getProductMaterials } from '@/domains/product-material/service'

// GET /api/products/[id]/materials
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const materials = await getProductMaterials(params.id)
    return NextResponse.json(materials)
  } catch (error) {
    console.error('Get product materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add app/api/products/[id]/generate-video/route.ts app/api/products/[id]/materials/route.ts
git commit -m "feat: add product video generation API routes"
```

---

## Task 7: 实现生成视频向导 UI

**Files:**
- Create: `app/(app)/products/[id]/GenerateVideoWizard.tsx`
- Modify: `app/(app)/products/[id]/page.tsx` (添加生成视频入口按钮)

- [ ] **Step 1: 创建向导组件 - 基础结构**

```tsx
// app/(app)/products/[id]/GenerateVideoWizard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GenerateVideoWizardProps {
  productId: string
  productName: string
  onClose: () => void
}

type WizardStep = 'select-ip' | 'select-scene-pose' | 'generate-effect' | 'select-movement' | 'generate-first-frame' | 'generate-video'

export function GenerateVideoWizard({ productId, productName, onClose }: GenerateVideoWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('select-ip')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [selectedPoseId, setSelectedPoseId] = useState<string | null>(null)
  const [selectedMakeupId, setSelectedMakeupId] = useState<string | null>(null)
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null)
  const [selectedCompositionId, setSelectedCompositionId] = useState<string | null>(null)

  // Result state
  const [effectImageUrl, setEffectImageUrl] = useState<string | null>(null)
  const [productMaterialId, setProductMaterialId] = useState<string | null>(null)
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const handleGenerateEffectImage = async () => {
    if (!selectedIpId || !selectedSceneId) {
      setError('请选择 IP 和场景')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/products/${productId}/generate-video?step=effect-image&ipId=${selectedIpId}&sceneId=${selectedSceneId}&poseId=${selectedPoseId || ''}&makeupId=${selectedMakeupId || ''}`
      )
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setEffectImageUrl(data.fullBodyUrl)
      setProductMaterialId(data.productMaterialId)
      setStep('generate-effect')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateFirstFrame = async () => {
    if (!productMaterialId || !selectedCompositionId) {
      setError('请选择构图')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/products/${productId}/generate-video?step=first-frame&productMaterialId=${productMaterialId}&compositionId=${selectedCompositionId}`
      )
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setFirstFrameUrl(data.firstFrameUrl)
      setStep('generate-first-frame')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!productMaterialId || !selectedIpId || !firstFrameUrl || !selectedMovementId) {
      setError('请完成所有步骤')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/products/${productId}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productMaterialId,
          ipId: selectedIpId,
          firstFrameUrl,
          movementId: selectedMovementId,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setVideoId(data.videoId)
      setVideoUrl(data.videoUrl)
      setStep('generate-video')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Wizard content based on step */}
        {step === 'select-ip' && (
          <SelectIpStep
            selectedIpId={selectedIpId}
            onSelect={setSelectedIpId}
            onNext={() => setStep('select-scene-pose')}
            onCancel={onClose}
          />
        )}
        {step === 'select-scene-pose' && (
          <SelectScenePoseStep
            selectedSceneId={selectedSceneId}
            selectedPoseId={selectedPoseId}
            selectedMakeupId={selectedMakeupId}
            onSelectScene={setSelectedSceneId}
            onSelectPose={setSelectedPoseId}
            onSelectMakeup={setSelectedMakeupId}
            onNext={handleGenerateEffectImage}
            onBack={() => setStep('select-ip')}
            onCancel={onClose}
            loading={loading}
          />
        )}
        {step === 'generate-effect' && effectImageUrl && (
          <EffectImagePreview
            imageUrl={effectImageUrl}
            onNext={() => setStep('select-movement')}
            onBack={() => setStep('select-scene-pose')}
            onCancel={onClose}
            onRetry={handleGenerateEffectImage}
          />
        )}
        {step === 'select-movement' && (
          <SelectMovementStep
            selectedMovementId={selectedMovementId}
            selectedCompositionId={selectedCompositionId}
            onSelectMovement={setSelectedMovementId}
            onSelectComposition={setSelectedCompositionId}
            onNext={handleGenerateFirstFrame}
            onBack={() => setStep('generate-effect')}
            onCancel={onClose}
            loading={loading}
          />
        )}
        {step === 'generate-first-frame' && firstFrameUrl && (
          <FirstFramePreview
            imageUrl={firstFrameUrl}
            onNext={handleGenerateVideo}
            onBack={() => setStep('select-movement')}
            onCancel={onClose}
            onRetry={handleGenerateFirstFrame}
            loading={loading}
          />
        )}
        {step === 'generate-video' && videoUrl && (
          <VideoPreview
            videoUrl={videoUrl}
            onFinish={() => router.push('/products')}
            onCancel={onClose}
          />
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 添加向导步骤组件（简化版，实际需要完整实现）**

由于组件较大，核心结构如下：

```tsx
// Step 组件示例 - SelectIpStep
function SelectIpStep({ selectedIpId, onSelect, onNext, onCancel }: any) {
  // 从 API 获取 IP 列表并展示
  // 用户选择后点击下一步
}

function SelectScenePoseStep({ ... }: any) {
  // 选择场景、姿势、妆容
}

function EffectImagePreview({ imageUrl, ... }: any) {
  // 展示效果图，用户确认或重试
}

function SelectMovementStep({ ... }: any) {
  // 选择动作和构图
}

function FirstFramePreview({ imageUrl, ... }: any) {
  // 展示首帧图
}

function VideoPreview({ videoUrl, ... }: any) {
  // 展示最终视频
}
```

- [ ] **Step 3: 修改产品详情页添加入口**

```tsx
// 在 app/(app)/products/[id]/page.tsx 中
// 添加按钮到"操作按钮"区域

<div className="flex gap-3 pt-2">
  <Link
    href={`/products/${product.id}/generate-video`}
    className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 flex items-center justify-center gap-2"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
    生成视频
  </Link>
  {/* 现有的编辑按钮 */}
</div>
```

- [ ] **Step 4: 创建独立的生成视频页面路由**

```tsx
// app/(app)/products/[id]/generate-video/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { GenerateVideoWizard } from '../GenerateVideoWizard'

export default function GenerateVideoPage() {
  const params = useParams()
  const [productName, setProductName] = useState('')

  useEffect(() => {
    // 获取产品名称
    fetch(`/api/products/${params.id}`)
      .then(res => res.json())
      .then(data => setProductName(data.name))
  }, [params.id])

  return (
    <GenerateVideoWizard
      productId={params.id as string}
      productName={productName}
      onClose={() => window.history.back()}
    />
  )
}
```

- [ ] **Step 5: 提交**

```bash
git add app/(app)/products/[id]/GenerateVideoWizard.tsx app/(app)/products/[id]/generate-video/
git add app/(app)/products/[id]/page.tsx
git commit -m "feat: add generate video wizard UI"
```

---

## 实现顺序

1. **Task 1**: 数据库迁移（必须先做）
2. **Task 2**: 工具定义文件
3. **Task 3**: product_material 类型和服务
4. **Task 4**: movement_material 类型和服务
5. **Task 5**: 视频生成服务
6. **Task 6**: API 路由
7. **Task 7**: UI 向导

---

## 验证清单

- [ ] 数据库迁移成功
- [ ] 工具定义导出正确
- [ ] API 路由返回正确数据
- [ ] 效果图生成流程正常
- [ ] 首帧图生成正常
- [ ] 视频生成正常（文字动作和视频动作两种）
- [ ] 向导 UI 交互正常
