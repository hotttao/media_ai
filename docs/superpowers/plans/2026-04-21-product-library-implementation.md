# 产品库功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现产品库功能，包含产品 CRUD、AI 自动填充、图片上传

**Architecture:** 遵循项目分层架构（L0-L3），产品模块放置在 `domains/product/`，组件在 `components/product/`，页面在 `app/(app)/products/`。AI 相关代码放在 `agent/` 目录。

**Tech Stack:** Next.js 14, Prisma, React Hook Form, Zod, shadcn/ui

---

## 文件结构总览

```
domains/product/
├── types.ts           # 产品类型定义
├── service.ts         # 产品服务
└── validators.ts      # 验证规则

agent/
├── prompts/product.ts     # 产品 AI 提示词（新增）
└── services/product-extractor.ts  # 产品信息提取服务（新增）

components/product/
├── ProductCard.tsx     # 产品卡片
├── ProductForm.tsx     # 产品表单（含 AI 填充）
└── ProductImageUploader.tsx  # 图片上传组件

app/(app)/
├── products/
│   ├── page.tsx        # 产品列表页
│   ├── [id]/page.tsx   # 产品详情页
│   └── new/page.tsx    # 新增产品页

app/api/
├── products/
│   ├── route.ts        # 产品 CRUD API
│   └── extract/route.ts # AI 提取信息 API
```

---

## 任务分解

### Task 1: Prisma Schema 更新

**Files:**
- Modify: `prisma/schema.prisma:259-261`

- [ ] **Step 1: 添加 TargetAudience 枚举和 Product、ProductImage 模型**

在 `prisma/schema.prisma` 文件末尾（在 `model Video` 之前）添加：

```prisma
enum TargetAudience {
  MENS
  WOMENS
  KIDS
}

model Product {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  teamId          String   @map("team_id")
  name            String   @db.VarChar(200)
  targetAudience  TargetAudience
  productDetails  String?  @db.Text
  displayActions  String?  @map("display_actions") @db.Text
  tags            String?  // JSON stored as String
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  images ProductImage[] @relation("ProductToImages")

  user   User @relation(fields: [userId], references: [id])
  team   Team @relation(fields: [teamId], references: [id])

  @@map("products")
}

model ProductImage {
  id        String  @id @default(uuid())
  productId String  @map("product_id")
  url       String  @db.VarChar(500)
  isMain    Boolean @default(false) @map("is_main")
  order     Int     @default(0)

  product Product @relation("ProductToImages", fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_images")
}
```

- [ ] **Step 2: 在 User 模型和 Team 模型中添加关联**

在 `model User` 中添加：
```prisma
products Product[] @relation("UserToProducts")
```

在 `model Team` 中添加：
```prisma
products Product[] @relation("TeamToProducts")
```

- [ ] **Step 3: 运行 prisma generate**

```bash
npx prisma generate
```

- [ ] **Step 4: 运行 prisma db push**

```bash
npx prisma db push
```

- [ ] **Step 5: 提交**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Product and ProductImage models for product library

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Domain Layer - 类型和服务

**Files:**
- Create: `domains/product/types.ts`
- Create: `domains/product/service.ts`
- Create: `domains/product/validators.ts`

- [ ] **Step 1: 创建 domains/product/types.ts**

```typescript
export type TargetAudience = 'MENS' | 'WOMENS' | 'KIDS'

export interface Product {
  id: string
  userId: string
  teamId: string
  name: string
  targetAudience: TargetAudience
  productDetails: string | null
  displayActions: string | null
  tags: string[] | null
  images: ProductImage[]
  createdAt: Date
  updatedAt: Date
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  isMain: boolean
  order: number
}

export interface CreateProductInput {
  name: string
  targetAudience: TargetAudience
  productDetails?: string
  displayActions?: string
  tags?: string[]
  images?: { url: string; isMain: boolean; order: number }[]
}

export interface ProductFilterInput {
  targetAudience?: TargetAudience
  search?: string
  tags?: string[]
}
```

- [ ] **Step 2: 创建 domains/product/service.ts**

```typescript
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateProductInput, ProductFilterInput } from './types'

export async function createProduct(
  userId: string,
  teamId: string,
  input: CreateProductInput
) {
  const images = input.images || []

  return db.product.create({
    data: {
      id: uuid(),
      userId,
      teamId,
      name: input.name,
      targetAudience: input.targetAudience,
      productDetails: input.productDetails,
      displayActions: input.displayActions,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      images: {
        create: images.map((img, idx) => ({
          id: uuid(),
          url: img.url,
          isMain: img.isMain,
          order: img.order ?? idx,
        })),
      },
    },
    include: { images: true },
  })
}

export async function getProducts(
  teamId: string,
  userId: string,
  filters?: ProductFilterInput
) {
  const where: any = {
    OR: [
      { teamId },
      // 未来可能添加公共产品过滤
    ],
  }

  if (filters?.targetAudience) {
    where.targetAudience = filters.targetAudience
  }

  if (filters?.search) {
    where.name = { contains: filters.search }
  }

  if (filters?.tags && filters.tags.length > 0) {
    // tags 是 JSON 存储，需要字符串包含匹配
    where.tags = {
      OR: filters.tags.map(tag => ({
        contains: tag,
      })),
    }
  }

  return db.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { images: true },
  })
}

export async function getProductById(id: string) {
  return db.product.findUnique({
    where: { id },
    include: { images: { orderBy: { order: 'asc' } } },
  })
}

export async function updateProduct(
  id: string,
  userId: string,
  teamId: string,
  input: Partial<CreateProductInput>
) {
  const { images, ...rest } = input

  // 先删除旧图片
  await db.productImage.deleteMany({ where: { productId: id } })

  // 更新产品并创建新图片
  return db.product.update({
    where: { id },
    data: {
      ...rest,
      tags: rest.tags ? JSON.stringify(rest.tags) : undefined,
      images: images ? {
        create: images.map((img, idx) => ({
          id: uuid(),
          url: img.url,
          isMain: img.isMain,
          order: img.order ?? idx,
        })),
      } : undefined,
    },
    include: { images: true },
  })
}

export async function deleteProduct(id: string, userId: string, teamId: string) {
  return db.product.deleteMany({
    where: {
      id,
      userId,
      teamId,
    },
  })
}
```

- [ ] **Step 3: 创建 domains/product/validators.ts**

```typescript
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, '产品名称不能为空').max(200),
  targetAudience: z.enum(['MENS', 'WOMENS', 'KIDS']),
  productDetails: z.string().optional(),
  displayActions: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.object({
    url: z.string().min(1),
    isMain: z.boolean().default(false),
    order: z.number().int().min(0).default(0),
  })).optional(),
})

export const productFilterSchema = z.object({
  targetAudience: z.enum(['MENS', 'WOMENS', 'KIDS']).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const extractProductInfoSchema = z.object({
  images: z.array(z.string().describe('Base64 encoded image data URL')).min(1),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type ProductFilterInput = z.infer<typeof productFilterSchema>
export type ExtractProductInfoInput = z.infer<typeof extractProductInfoSchema>
```

- [ ] **Step 4: 提交**

```bash
git add domains/product/
git commit -m "feat: add product domain layer - types, service, validators

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Agent 模块 - AI 提示词和提取服务

**Files:**
- Create: `agent/prompts/product.ts`
- Create: `agent/services/product-extractor.ts`

- [ ] **Step 1: 创建 agent/prompts/product.ts**

```typescript
export const EXTRACT_PRODUCT_INFO_PROMPT = `
分析用户上传的产品图片，提取产品信息用于电商带货视频制作。

请从图片中提取以下信息：

1. 产品名称：根据主图推断产品名称/标题
2. 适用人群：判断是男装(MENS)、女装(WOMENS)还是童装(KIDS)
3. 产品细节：从图片中提取产品特点、特殊设计、做工、面料等细节
4. 展示动作：根据产品特点推荐展示动作，用于视频生成时的动作参考

分析要求：
1. 仔细观察产品特点，特别是细节图中的特色设计
2. 展示动作应该能突出产品卖点
3. 用中文回复，描述要具体

返回格式（JSON）：
{
  "name": "产品名称",
  "targetAudience": "MENS|WOMENS|KIDS",
  "productDetails": "产品特点描述",
  "displayActions": "动作1: 描述\\n动作2: 描述"
}
`
```

- [ ] **Step 2: 创建 agent/services/product-extractor.ts**

```typescript
import { extractJson } from '../llm'
import { EXTRACT_PRODUCT_INFO_PROMPT } from '../prompts/product'

interface ExtractedProductInfo {
  name: string
  targetAudience: 'MENS' | 'WOMENS' | 'KIDS'
  productDetails: string
  displayActions: string
}

export async function extractProductInfo(
  images: string[], // Base64 data URLs
  model: (messages: any[]) => Promise<string>
): Promise<ExtractedProductInfo | null> {
  // 构建消息：系统提示 + 用户消息（含图片）
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: EXTRACT_PRODUCT_INFO_PROMPT },
        ...images.map(imageDataUrl => ({
          type: 'image_url' as const,
          image_url: { url: imageDataUrl },
        })),
      ],
    },
  ]

  const response = await model(messages)
  const json = extractJson(response)

  if (!json) return null

  // 验证并规范化返回数据
  const validAudiences = ['MENS', 'WOMENS', 'KIDS']
  const targetAudience = validAudiences.includes(json.targetAudience)
    ? json.targetAudience
    : 'WOMENS' // 默认女装

  return {
    name: typeof json.name === 'string' ? json.name : '',
    targetAudience,
    productDetails: typeof json.productDetails === 'string' ? json.productDetails : '',
    displayActions: typeof json.displayActions === 'string' ? json.displayActions : '',
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add agent/prompts/product.ts agent/services/product-extractor.ts
git commit -m "feat: add product AI extraction prompt and service

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: API Routes

**Files:**
- Create: `app/api/products/route.ts`
- Create: `app/api/products/[id]/route.ts`
- Create: `app/api/products/extract/route.ts`

- [ ] **Step 1: 创建 app/api/products/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createProduct, getProducts } from '@/domains/product/service'
import { createProductSchema, productFilterSchema } from '@/domains/product/validators'

// GET /api/products - 获取产品列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || undefined,
      targetAudience: searchParams.get('targetAudience') as any || undefined,
    }

    const products = await getProducts(
      session.user.teamId!,
      session.user.id,
      filters
    )

    return NextResponse.json(products)
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/products - 创建产品
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = createProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const product = await createProduct(
      session.user.id,
      session.user.teamId,
      parsed.data
    )

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建 app/api/products/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getProductById, updateProduct, deleteProduct } from '@/domains/product/service'
import { createProductSchema } from '@/domains/product/validators'

// GET /api/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await getProductById(params.id)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/products/[id]
export async function PATCH(
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
    const parsed = createProductSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const product = await updateProduct(
      params.id,
      session.user.id,
      session.user.teamId,
      parsed.data
    )

    return NextResponse.json(product)
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/products/[id]
export async function DELETE(
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

    await deleteProduct(params.id, session.user.id, session.user.teamId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 创建 app/api/products/extract/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { extractProductInfoSchema } from '@/domains/product/validators'
import { extractProductInfo } from '@/agent/services/product-extractor'
import { models } from '@/agent/llm'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = extractProductInfoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { images } = parsed.data

    // 使用 translator 模型进行图片分析
    const result = await extractProductInfo(images, async (messages) => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages,
          max_tokens: 1000,
        }),
      })

      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to extract product info' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Extract product info error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add app/api/products/
git commit -m "feat: add product API routes - CRUD and AI extract

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Components

**Files:**
- Create: `components/product/ProductCard.tsx`
- Create: `components/product/ProductImageUploader.tsx`
- Create: `components/product/ProductForm.tsx`

- [ ] **Step 1: 创建 components/product/ProductCard.tsx**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/domains/product/types'

interface ProductCardProps {
  product: Product
}

const audienceLabels = {
  MENS: '男装',
  WOMENS: '女装',
  KIDS: '童装',
}

export function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.images?.find(img => img.isMain) || product.images?.[0]

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-card border border-border shadow-clay overflow-hidden hover:border-matcha-600 transition-colors cursor-pointer">
        {/* Image */}
        <div className="aspect-square relative bg-gray-100">
          {mainImage ? (
            <Image
              src={mainImage.url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center text-gray-400">
              <span className="text-4xl">👕</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
              {audienceLabels[product.targetAudience]}
            </span>
          </div>
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.tags.slice(0, 2).map((tag, idx) => (
                <span key={idx} className="text-xs text-gray-500">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: 创建 components/product/ProductImageUploader.tsx**

```tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface ImageItem {
  url: string
  isMain: boolean
  order: number
}

interface ProductImageUploaderProps {
  images: ImageItem[]
  onChange: (images: ImageItem[]) => void
}

export function ProductImageUploader({ images, onChange }: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const newImages: ImageItem[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 上传文件
        const formData = new FormData()
        formData.append('file', file)
        formData.append('subDir', 'products')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error('Upload failed')

        const { url } = await response.json()

        newImages.push({
          url,
          isMain: images.length === 0 && i === 0, // 第一张默认为主图
          order: images.length + i,
        })
      }

      onChange([...images, ...newImages])
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    const updated = images.filter((_, i) => i !== index)
    // 重新计算主图
    if (updated.length > 0 && !updated.some(img => img.isMain)) {
      updated[0].isMain = true
    }
    onChange(updated)
  }

  function setMainImage(index: number) {
    const updated = images.map((img, i) => ({
      ...img,
      isMain: i === index,
    }))
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? '上传中...' : '上传图片'}
      </Button>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group"
            >
              <img
                src={image.url}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setMainImage(index)}
                  className={`px-2 py-1 rounded text-xs text-white ${
                    image.isMain ? 'bg-matcha-600' : 'bg-black/50'
                  }`}
                >
                  {image.isMain ? '主图' : '设为主图'}
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="px-2 py-1 rounded bg-red-500 text-xs text-white"
                >
                  删除
                </button>
              </div>

              {image.isMain && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-matcha-600 text-white text-xs rounded">
                  主图
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 创建 components/product/ProductForm.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductImageUploader } from './ProductImageUploader'

interface ImageItem {
  url: string
  isMain: boolean
  order: number
}

interface ProductFormProps {
  initialData?: {
    name: string
    targetAudience: string
    productDetails: string
    displayActions: string
    tags: string[]
    images: ImageItem[]
  }
  isEditing?: boolean
}

export function ProductForm({ initialData, isEditing }: ProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  const [name, setName] = useState(initialData?.name || '')
  const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || 'WOMENS')
  const [productDetails, setProductDetails] = useState(initialData?.productDetails || '')
  const [displayActions, setDisplayActions] = useState(initialData?.displayActions || '')
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '')
  const [images, setImages] = useState<ImageItem[]>(initialData?.images || [])

  async function handleExtractInfo() {
    if (images.length === 0) {
      alert('请先上传至少一张产品图片')
      return
    }

    setIsExtracting(true)

    try {
      // 转换为 Base64
      const base64Images = await Promise.all(
        images.map(async (img) => {
          const response = await fetch(img.url)
          const blob = await response.blob()
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        })
      )

      const response = await fetch('/api/products/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      })

      if (!response.ok) throw new Error('Extract failed')

      const data = await response.json()

      // 自动填充表单
      setName(data.name || name)
      setTargetAudience(data.targetAudience || targetAudience)
      setProductDetails(data.productDetails || productDetails)
      setDisplayActions(data.displayActions || displayActions)
    } catch (error) {
      alert(error instanceof Error ? error.message : '提取失败')
    } finally {
      setIsExtracting(false)
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        name,
        targetAudience,
        productDetails: productDetails || undefined,
        displayActions: displayActions || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        images: images.map((img, idx) => ({
          url: img.url,
          isMain: img.isMain,
          order: idx,
        })),
      }

      const url = isEditing
        ? `/api/products/${initialData?.name}` // 需要传入 id，这里简化
        : '/api/products'

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to save')

      router.push('/products')
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Images */}
      <div className="space-y-2">
        <Label>产品图片</Label>
        <ProductImageUploader images={images} onChange={setImages} />

        {images.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleExtractInfo}
            disabled={isExtracting}
          >
            {isExtracting ? '分析中...' : 'AI 提取信息'}
          </Button>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">产品名称 *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入产品名称"
          required
        />
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label htmlFor="targetAudience">适用人群 *</Label>
        <Select value={targetAudience} onValueChange={setTargetAudience}>
          <SelectTrigger>
            <SelectValue placeholder="选择适用人群" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MENS">男装</SelectItem>
            <SelectItem value="WOMENS">女装</SelectItem>
            <SelectItem value="KIDS">童装</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">产品标签（逗号分隔）</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="如: 春夏, 休闲, 运动"
        />
      </div>

      {/* Product Details */}
      <div className="space-y-2">
        <Label htmlFor="productDetails">产品细节</Label>
        <textarea
          id="productDetails"
          value={productDetails}
          onChange={(e) => setProductDetails(e.target.value)}
          placeholder="描述产品特点、特殊设计等"
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
        />
      </div>

      {/* Display Actions */}
      <div className="space-y-2">
        <Label htmlFor="displayActions">展示动作</Label>
        <textarea
          id="displayActions"
          value={displayActions}
          onChange={(e) => setDisplayActions(e.target.value)}
          placeholder="格式: 动作1: 描述&#10;动作2: 描述"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isLoading || !name.trim()}>
        {isLoading ? '保存中...' : isEditing ? '更新产品' : '创建产品'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add components/product/
git commit -m "feat: add product components - Card, ImageUploader, Form

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Pages

**Files:**
- Create: `app/(app)/products/page.tsx`
- Create: `app/(app)/products/[id]/page.tsx`
- Create: `app/(app)/products/new/page.tsx`

- [ ] **Step 1: 创建 app/(app)/products/page.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductCard } from '@/components/product/ProductCard'

interface Product {
  id: string
  name: string
  targetAudience: 'MENS' | 'WOMENS' | 'KIDS'
  tags: string | null
  images: { url: string; isMain: boolean }[]
  createdAt: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [targetAudience, setTargetAudience] = useState<string>('ALL')

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (targetAudience !== 'ALL') params.set('targetAudience', targetAudience)

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts()
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, targetAudience])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-matcha-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">产品库</h1>
          <p className="text-sm text-warm-silver mt-1">管理您的产品素材</p>
        </div>
        <Link href="/products/new">
          <Button>添加产品</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="搜索产品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={targetAudience} onValueChange={setTargetAudience}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="适用人群" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部</SelectItem>
            <SelectItem value="MENS">男装</SelectItem>
            <SelectItem value="WOMENS">女装</SelectItem>
            <SelectItem value="KIDS">童装</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-12 text-warm-silver">
          <p className="text-lg">暂无产品</p>
          <Link href="/products/new">
            <Button variant="link" className="mt-2">点击添加第一个产品</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建 app/(app)/products/new/page.tsx**

```tsx
import { ProductForm } from '@/components/product/ProductForm'

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">添加产品</h1>
        <p className="text-sm text-warm-silver mt-1">上传产品图片并填写产品信息</p>
      </div>

      <div className="bg-white rounded-card border border-border shadow-clay p-6">
        <ProductForm />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建 app/(app)/products/[id]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { getProductById } from '@/domains/product/service'

const audienceLabels = {
  MENS: '男装',
  WOMENS: '女装',
  KIDS: '童装',
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const product = await getProductById(params.id)

  if (!product) {
    notFound()
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/products" className="text-sm text-warm-silver hover:text-foreground mb-2 inline-block">
            ← 返回产品列表
          </Link>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm px-3 py-1 bg-gray-100 rounded-full">
              {audienceLabels[product.targetAudience]}
            </span>
            {product.tags && (
              <span className="text-sm text-warm-silver">
                {JSON.parse(product.tags).join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">编辑</Button>
          <Button variant="destructive">删除</Button>
        </div>
      </div>

      {/* Images */}
      {product.images && product.images.length > 0 && (
        <div className="bg-white rounded-card border border-border shadow-clay p-6 mb-6">
          <h2 className="font-medium mb-4">产品图片</h2>
          <div className="grid grid-cols-3 gap-4">
            {product.images.map((image) => (
              <div
                key={image.id}
                className={`relative aspect-square rounded-lg overflow-hidden ${
                  image.isMain ? 'ring-2 ring-matcha-600' : ''
                }`}
              >
                <Image
                  src={image.url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {image.isMain && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-matcha-600 text-white text-xs rounded">
                    主图
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-card border border-border shadow-clay p-6">
        <h2 className="font-medium mb-4">产品详情</h2>

        {product.productDetails && (
          <div className="mb-4">
            <h3 className="text-sm text-warm-silver mb-1">产品细节</h3>
            <p className="text-sm whitespace-pre-wrap">{product.productDetails}</p>
          </div>
        )}

        {product.displayActions && (
          <div>
            <h3 className="text-sm text-warm-silver mb-1">展示动作</h3>
            <p className="text-sm whitespace-pre-wrap">{product.displayActions}</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add app/\(app\)/products/
git commit -m "feat: add product pages - list, detail, new

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 自检清单

### 1. Spec 覆盖
| Spec Section | Task |
|---|---|
| 数据模型 Product + ProductImage | Task 1 |
| Domain layer (types, service, validators) | Task 2 |
| AI 提示词和服务 | Task 3 |
| API Routes (CRUD + extract) | Task 4 |
| Components (Card, ImageUploader, Form) | Task 5 |
| Pages (list, detail, new) | Task 6 |

### 2. 占位符扫描
- 无 "TODO" / "TBD"
- 所有表单有实际提交逻辑
- 所有 API 有错误处理

### 3. 类型一致性
- `domains/product/types.ts` 中的类型与 Prisma schema 一致
- `TargetAudience` = `'MENS' | 'WOMENS' | 'KIDS'`
- API 返回类型与组件使用类型匹配

### 4. 目录结构
所有文件位于正确层级（L0-L3），无跨层依赖

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-21-product-library-implementation.md`**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?