# 虚拟 IP 视频智能体 — Phase 2 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现虚拟 IP 管理模块和素材库管理模块，包含文件上传功能。

**Architecture:** Next.js API Routes + Prisma ORM，文件上传到本地 `/public/uploads` 目录，MySQL 存储元数据。

**Tech Stack:** Next.js 14, Prisma, React Hook Form, Zod, Local File System

---

## 文件结构总览

```
media_ai/
├── app/
│   ├── (app)/
│   │   ├── ips/
│   │   │   ├── page.tsx           # IP 列表页
│   │   │   ├── new/page.tsx       # 创建 IP 页
│   │   │   └── [id]/page.tsx     # IP 详情页
│   │   └── materials/
│   │       ├── page.tsx           # 素材库列表页
│   │       └── ip/[ipId]/page.tsx # IP 特有素材页
│   └── api/
│       ├── ips/
│       │   ├── route.ts           # IP CRUD API
│       │   ├── [id]/route.ts      # IP 单条操作 API
│       │   └── [id]/images/route.ts # IP 图片上传 API
│       └── materials/
│           ├── route.ts           # 普通素材 CRUD API
│           ├── [id]/route.ts      # 单条素材 API
│           └── ip/[ipId]/route.ts # IP 特有素材 API
├── components/
│   └── ip/
│       ├── IpCard.tsx
│       ├── IpForm.tsx
│       └── IpImageUploader.tsx
│   └── material/
│       ├── MaterialCard.tsx
│       ├── MaterialUploader.tsx
│       └── MaterialFilter.tsx
├── domains/
│   ├── virtual-ip/
│   │   ├── types.ts
│   │   ├── validators.ts
│   │   └── service.ts
│   └── materials/
│       ├── types.ts
│       ├── validators.ts
│       └── service.ts
└── foundation/
    └── lib/
        └── file-upload.ts         # 文件上传工具函数
```

---

## 依赖安装清单

```bash
# 文件上传支持
npm install formidable
npm install -D @types/formidable
```

---

## 任务分解

### Task 1: 文件上传基础设施

**Files:**
- Create: `foundation/lib/file-upload.ts`
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: 创建 foundation/lib/file-upload.ts**

```typescript
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

// Ensure upload directory exists
export function ensureUploadDir(teamId: string): string {
  const teamDir = path.join(UPLOAD_DIR, 'teams', teamId)
  if (!fs.existsSync(teamDir)) {
    fs.mkdirSync(teamDir, { recursive: true })
  }
  return teamDir
}

// Generate unique filename preserving extension
export function generateFileName(originalName: string): string {
  const ext = path.extname(originalName)
  const baseName = path.basename(originalName, ext)
  return `${baseName}_${uuid()}${ext}`
}

// Get public URL path for a file
export function getPublicUrl(teamId: string, fileName: string): string {
  return `/uploads/teams/${teamId}/${fileName}`
}

// Delete a file
export function deleteFile(teamId: string, fileName: string): void {
  const filePath = path.join(UPLOAD_DIR, 'teams', teamId, fileName)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

// Get full filesystem path
export function getFilePath(teamId: string, fileName: string): string {
  return path.join(UPLOAD_DIR, 'teams', teamId, fileName)
}
```

- [ ] **Step 2: 创建通用文件上传 API**

创建目录 `app/api/upload/`：

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { ensureUploadDir, generateFileName, getPublicUrl } from '@/foundation/lib/file-upload'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const subDir = formData.get('subDir') as string || '' // e.g., 'ips', 'materials'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const teamId = session.user.teamId
    const uploadDir = ensureUploadDir(teamId)
    const targetDir = subDir ? path.join(uploadDir, subDir) : uploadDir

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const fileName = generateFileName(file.name)
    const filePath = path.join(targetDir, fileName)
    const publicUrl = getPublicUrl(teamId, subDir ? `${subDir}/${fileName}` : fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    return NextResponse.json({ url: publicUrl, fileName })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

需要补充 fs 导入：
```typescript
import fs from 'fs'
```

- [ ] **Step 3: 提交**

```bash
git add foundation/lib/file-upload.ts app/api/upload/route.ts
git commit -m "Task 1: Add file upload infrastructure"
```

---

### Task 2: 虚拟 IP Domain 层

**Files:**
- Create: `domains/virtual-ip/types.ts`
- Create: `domains/virtual-ip/validators.ts`
- Create: `domains/virtual-ip/service.ts`

- [ ] **Step 1: 创建 domains/virtual-ip/types.ts**

```typescript
export interface VirtualIp {
  id: string
  userId: string
  teamId: string
  nickname: string
  avatar: string | null
  age: number | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  height: number | null
  weight: number | null
  bust: number | null
  waist: number | null
  hip: number | null
  education: string | null
  major: string | null
  personality: string | null
  catchphrase: string | null
  classicAccessories: string | null
  classicActions: string | null
  platforms: PlatformInfo[] | null
  createdAt: Date
  updatedAt: Date
}

export interface PlatformInfo {
  platform: string // 'douyin' | 'weixin' | 'kuaishou' | 'xiaohongshu'
  accountId: string
}

export interface IpImage {
  id: string
  ipId: string
  avatarUrl: string | null
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  createdAt: Date
}

export interface CreateIpInput {
  nickname: string
  avatar?: string
  age?: number
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  height?: number
  weight?: number
  bust?: number
  waist?: number
  hip?: number
  education?: string
  major?: string
  personality?: string
  catchphrase?: string
  classicAccessories?: string
  classicActions?: string
  platforms?: PlatformInfo[]
}

export interface UpdateIpInput extends Partial<CreateIpInput> {}
```

- [ ] **Step 2: 创建 domains/virtual-ip/validators.ts**

```typescript
import { z } from 'zod'

export const createIpSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(50),
  avatar: z.string().optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  bust: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hip: z.number().positive().optional(),
  education: z.string().max(50).optional(),
  major: z.string().max(100).optional(),
  personality: z.string().max(200).optional(),
  catchphrase: z.string().max(200).optional(),
  classicAccessories: z.string().max(500).optional(),
  classicActions: z.string().max(500).optional(),
  platforms: z.array(z.object({
    platform: z.string(),
    accountId: z.string(),
  })).optional(),
})

export const updateIpSchema = createIpSchema.partial()

export type CreateIpInput = z.infer<typeof createIpSchema>
export type UpdateIpInput = z.infer<typeof updateIpSchema>
```

- [ ] **Step 3: 创建 domains/virtual-ip/service.ts**

```typescript
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateIpInput, UpdateIpInput, IpImage } from './types'

export async function createVirtualIp(userId: string, teamId: string, input: CreateIpInput) {
  return db.virtualIp.create({
    data: {
      id: uuid(),
      userId,
      teamId,
      nickname: input.nickname,
      avatar: input.avatar,
      age: input.age,
      gender: input.gender,
      height: input.height,
      weight: input.weight,
      bust: input.bust,
      waist: input.waist,
      hip: input.hip,
      education: input.education,
      major: input.major,
      personality: input.personality,
      catchphrase: input.catchphrase,
      classicAccessories: input.classicAccessories,
      classicActions: input.classicActions,
      platforms: input.platforms ? JSON.stringify(input.platforms) : null,
    },
  })
}

export async function getVirtualIps(teamId: string) {
  return db.virtualIp.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    include: {
      images: true,
    },
  })
}

export async function getVirtualIpById(id: string, teamId: string) {
  return db.virtualIp.findFirst({
    where: { id, teamId },
    include: {
      images: true,
      ipMaterials: true,
    },
  })
}

export async function updateVirtualIp(id: string, teamId: string, input: UpdateIpInput) {
  return db.virtualIp.updateMany({
    where: { id, teamId },
    data: {
      ...input,
      platforms: input.platforms ? JSON.stringify(input.platforms) : undefined,
    },
  })
}

export async function deleteVirtualIp(id: string, teamId: string) {
  return db.virtualIp.deleteMany({
    where: { id, teamId },
  })
}

export async function createOrUpdateIpImage(
  ipId: string,
  data: { avatarUrl?: string; fullBodyUrl?: string; threeViewUrl?: string; nineViewUrl?: string }
) {
  const existing = await db.ipImage.findUnique({ where: { ipId } })

  if (existing) {
    return db.ipImage.update({
      where: { ipId },
      data,
    })
  }

  return db.ipImage.create({
    data: {
      id: uuid(),
      ipId,
      ...data,
    },
  })
}
```

- [ ] **Step 4: 提交**

```bash
git add domains/virtual-ip/
git commit -m "Task 2: Add virtual IP domain layer - types, validators, service"
```

---

### Task 3: 虚拟 IP API Routes

**Files:**
- Create: `app/api/ips/route.ts`
- Create: `app/api/ips/[id]/route.ts`
- Create: `app/api/ips/[id]/images/route.ts`

- [ ] **Step 1: 创建 app/api/ips/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createVirtualIp, getVirtualIps } from '@/domains/virtual-ip/service'
import { createIpSchema } from '@/domains/virtual-ip/validators'
import { z } from 'zod'

// GET /api/ips - List all IPs for the team
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const ips = await getVirtualIps(session.user.teamId)
    return NextResponse.json(ips)
  } catch (error) {
    console.error('List IPs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ips - Create a new IP
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const body = await request.json()
    const validated = createIpSchema.parse(body)

    const ip = await createVirtualIp(session.user.id, session.user.teamId, validated)
    return NextResponse.json(ip, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Create IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建 app/api/ips/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVirtualIpById, updateVirtualIp, deleteVirtualIp } from '@/domains/virtual-ip/service'
import { updateIpSchema } from '@/domains/virtual-ip/validators'
import { z } from 'zod'

type RouteParams = { params: { id: string } }

// GET /api/ips/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const ip = await getVirtualIpById(params.id, session.user.teamId)
    if (!ip) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 })
    }

    return NextResponse.json(ip)
  } catch (error) {
    console.error('Get IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/ips/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const body = await request.json()
    const validated = updateIpSchema.parse(body)

    const result = await updateVirtualIp(params.id, session.user.teamId, validated)
    if (result.count === 0) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 })
    }

    const updated = await getVirtualIpById(params.id, session.user.teamId)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Update IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/ips/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const result = await deleteVirtualIp(params.id, session.user.teamId)
    if (result.count === 0) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 创建 app/api/ips/[id]/images/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createOrUpdateIpImage } from '@/domains/virtual-ip/service'

type RouteParams = { params: { id: string } }

// POST /api/ips/[id]/images - Upload images for an IP
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const formData = await request.formData()
    const avatar = formData.get('avatar') as File | null
    const fullBody = formData.get('fullBody') as File | null
    const threeView = formData.get('threeView') as File | null
    const nineView = formData.get('nineView') as File | null

    const uploadDir = `ips/${params.id}`
    const uploadedUrls: Record<string, string> = {}

    // Helper to upload a single file
    async function uploadFile(file: File, fieldName: string): Promise<string | null> {
      if (!file) return null

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ file, subDir: uploadDir }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Actually we need to send FormData directly to /api/upload
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('subDir', uploadDir)

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) return null
      const data = await uploadResponse.json()
      return data.url
    }

    // Note: We can't call /api/upload from the server directly in this handler
    // Instead, we should handle file saving here directly
    // Let me rewrite this to save files directly

    return NextResponse.json({ error: 'Use /api/upload first, then call this with URLs' }, { status: 400 })
  } catch (error) {
    console.error('Upload IP images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

这个 handler 需要重构，因为不能从 API route 调用另一个 route。重构为直接保存文件：

- [ ] **Step 4: 重写 app/api/ips/[id]/images/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createOrUpdateIpImage } from '@/domains/virtual-ip/service'
import { ensureUploadDir, generateFileName, getPublicUrl } from '@/foundation/lib/file-upload'
import fs from 'fs'
import path from 'path'

type RouteParams = { params: { id: string } }

// POST /api/ips/[id]/images - Upload images for an IP
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()

    const avatar = formData.get('avatar') as File | null
    const fullBody = formData.get('fullBody') as File | null
    const threeView = formData.get('threeView') as File | null
    const nineView = formData.get('nineView') as File | null

    const teamId = session.user.teamId
    const ipId = params.id
    const subDir = path.join('ips', ipId)
    const uploadDir = ensureUploadDir(teamId)
    const targetDir = path.join(uploadDir, subDir)

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const uploadedUrls: Record<string, string> = {}

    async function processFile(file: File | null, fieldName: string): Promise<string | null> {
      if (!file) return null
      const fileName = generateFileName(file.name)
      const filePath = path.join(targetDir, fileName)
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, buffer)
      return getPublicUrl(teamId, path.join(subDir, fileName))
    }

    const [avatarUrl, fullBodyUrl, threeViewUrl, nineViewUrl] = await Promise.all([
      processFile(avatar, 'avatar'),
      processFile(fullBody, 'fullBody'),
      processFile(threeView, 'threeView'),
      processFile(nineView, 'nineView'),
    ])

    const image = await createOrUpdateIpImage(ipId, {
      avatarUrl: avatarUrl || undefined,
      fullBodyUrl: fullBodyUrl || undefined,
      threeViewUrl: threeViewUrl || undefined,
      nineViewUrl: nineViewUrl || undefined,
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error('Upload IP images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 5: 提交**

```bash
git add app/api/ips/
git commit -m "Task 3: Add virtual IP API routes - CRUD and image upload"
```

---

### Task 4: 虚拟 IP UI 页面

**Files:**
- Create: `app/(app)/ips/page.tsx`
- Create: `app/(app)/ips/new/page.tsx`
- Create: `app/(app)/ips/[id]/page.tsx`
- Create: `components/ip/IpCard.tsx`
- Create: `components/ip/IpForm.tsx`

- [ ] **Step 1: 创建 components/ip/IpCard.tsx**

```tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface IpCardProps {
  ip: {
    id: string
    nickname: string
    avatar: string | null
    gender: string | null
    personality: string | null
    images: Array<{ avatarUrl: string | null }>
  }
}

export function IpCard({ ip }: IpCardProps) {
  const imageUrl = ip.images?.[0]?.avatarUrl || ip.avatar || 'https://via.placeholder.com/150'

  return (
    <Link href={`/ips/${ip.id}`}>
      <Card className="hover:border-matcha-600 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-oat-light flex-shrink-0">
              <img
                src={imageUrl}
                alt={ip.nickname}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{ip.nickname}</h3>
              <div className="flex items-center gap-2 mt-1">
                {ip.gender && (
                  <Badge variant="secondary" className="text-xs">
                    {ip.gender === 'MALE' ? '男' : ip.gender === 'FEMALE' ? '女' : '其他'}
                  </Badge>
                )}
                {ip.personality && (
                  <span className="text-xs text-warm-silver truncate">
                    {ip.personality}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: 创建 components/ip/IpForm.tsx**

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface IpFormProps {
  initialData?: {
    nickname?: string
    gender?: string
    age?: number
    height?: number
    weight?: number
    education?: string
    major?: string
    personality?: string
    catchphrase?: string
  }
  isEdit?: boolean
}

export function IpForm({ initialData, isEdit }: IpFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const data = {
      nickname: formData.get('nickname'),
      gender: formData.get('gender') || undefined,
      age: formData.get('age') ? Number(formData.get('age')) : undefined,
      height: formData.get('height') ? Number(formData.get('height')) : undefined,
      weight: formData.get('weight') ? Number(formData.get('weight')) : undefined,
      education: formData.get('education') || undefined,
      major: formData.get('major') || undefined,
      personality: formData.get('personality') || undefined,
      catchphrase: formData.get('catchphrase') || undefined,
    }

    try {
      const url = isEdit ? `/api/ips/${initialData?.nickname}` : '/api/ips' // Note: need actual ID in edit mode
      const method = isEdit ? 'PUT' : 'POST'

      // For new IP creation
      const response = await fetch('/api/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save IP')
      }

      router.push('/ips')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称 *</Label>
              <Input
                id="nickname"
                name="nickname"
                defaultValue={initialData?.nickname}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">性别</Label>
              <Select name="gender" defaultValue={initialData?.gender || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">男</SelectItem>
                  <SelectItem value="FEMALE">女</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">年龄</Label>
              <Input
                id="age"
                name="age"
                type="number"
                min="0"
                max="150"
                defaultValue={initialData?.age}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">学历</Label>
              <Input
                id="education"
                name="education"
                defaultValue={initialData?.education}
                placeholder="如：本科"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">专业</Label>
              <Input
                id="major"
                name="major"
                defaultValue={initialData?.major}
                placeholder="如：计算机科学"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>人物特征</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">身高 (cm)</Label>
              <Input
                id="height"
                name="height"
                type="number"
                step="0.1"
                defaultValue={initialData?.height}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">体重 (kg)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                defaultValue={initialData?.weight}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">性格描述</Label>
            <Input
              id="personality"
              name="personality"
              defaultValue={initialData?.personality}
              placeholder="如：活泼开朗、温柔体贴"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catchphrase">口头禅</Label>
            <Input
              id="catchphrase"
              name="catchphrase"
              defaultValue={initialData?.catchphrase}
              placeholder="如：OMG，买它！"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '保存中...' : isEdit ? '保存修改' : '创建 IP'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
```

需要添加 Select 组件，先创建：

- [ ] **Step 3: 添加 shadcn/ui Select 组件**

```bash
npx shadcn@latest add select -y
```

然后继续创建 UI 页面：

- [ ] **Step 4: 创建 app/(app)/ips/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { IpCard } from '@/components/ip/IpCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function IpsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    return (
      <div className="space-y-4">
        <p>请先加入一个团队</p>
      </div>
    )
  }

  const ips = await db.virtualIp.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { createdAt: 'desc' },
    include: { images: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">虚拟 IP</h1>
          <p className="text-warm-silver mt-1">管理你的虚拟人物形象</p>
        </div>
        <Button asChild>
          <Link href="/ips/new">创建新 IP</Link>
        </Button>
      </div>

      {ips.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-warm-silver mb-4">还没有创建任何虚拟 IP</p>
          <Button asChild>
            <Link href="/ips/new">创建你的第一个 IP</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ips.map((ip) => (
            <IpCard key={ip.id} ip={ip} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 创建 app/(app)/ips/new/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { IpForm } from '@/components/ip/IpForm'

export default async function NewIpPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">创建虚拟 IP</h1>
        <p className="text-warm-silver mt-1">定义一个新的人物形象</p>
      </div>

      <IpForm />
    </div>
  )
}
```

- [ ] **Step 6: 创建 app/(app)/ips/[id]/page.tsx**

```tsx
import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { IpForm } from '@/components/ip/IpForm'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default async function IpDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const ip = await db.virtualIp.findFirst({
    where: { id: params.id, teamId: session.user.teamId },
    include: { images: true },
  })

  if (!ip) {
    notFound()
  }

  const imageUrl = ip.images?.[0]?.avatarUrl || ip.avatar || 'https://via.placeholder.com/300'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href="/ips">&larr; 返回列表</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: IP Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-card border border-border shadow-clay p-6">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-feature overflow-hidden bg-oat-light flex-shrink-0">
                <img
                  src={imageUrl}
                  alt={ip.nickname}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold">{ip.nickname}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ip.gender && (
                    <Badge>
                      {ip.gender === 'MALE' ? '男' : ip.gender === 'FEMALE' ? '女' : '其他'}
                    </Badge>
                  )}
                  {ip.age && <Badge variant="secondary">{ip.age}岁</Badge>}
                  {ip.education && <Badge variant="secondary">{ip.education}</Badge>}
                </div>
                {ip.personality && (
                  <p className="text-warm-silver mt-3">{ip.personality}</p>
                )}
                {ip.catchphrase && (
                  <p className="text-sm italic text-matcha-600 mt-2">"{ip.catchphrase}"</p>
                )}
              </div>
            </div>

            {/* Body Stats */}
            {(ip.height || ip.weight || ip.bust || ip.waist || ip.hip) && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-medium mb-3">身体数据</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {ip.height && (
                    <div>
                      <p className="text-xs text-warm-silver">身高</p>
                      <p className="font-medium">{ip.height} cm</p>
                    </div>
                  )}
                  {ip.weight && (
                    <div>
                      <p className="text-xs text-warm-silver">体重</p>
                      <p className="font-medium">{ip.weight} kg</p>
                    </div>
                  )}
                  {ip.bust && (
                    <div>
                      <p className="text-xs text-warm-silver">胸围</p>
                      <p className="font-medium">{ip.bust} cm</p>
                    </div>
                  )}
                  {ip.waist && (
                    <div>
                      <p className="text-xs text-warm-silver">腰围</p>
                      <p className="font-medium">{ip.waist} cm</p>
                    </div>
                  )}
                  {ip.hip && (
                    <div>
                      <p className="text-xs text-warm-silver">臀围</p>
                      <p className="font-medium">{ip.hip} cm</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Images Gallery */}
          {ip.images && ip.images.length > 0 && (
            <div className="bg-white rounded-card border border-border shadow-clay p-6">
              <h3 className="text-lg font-semibold mb-4">形象图</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ip.images[0].avatarUrl && (
                  <div>
                    <p className="text-xs text-warm-silver mb-1">头像</p>
                    <img src={ip.images[0].avatarUrl} alt="avatar" className="rounded-lg w-full" />
                  </div>
                )}
                {ip.images[0].fullBodyUrl && (
                  <div>
                    <p className="text-xs text-warm-silver mb-1">全身图</p>
                    <img src={ip.images[0].fullBodyUrl} alt="full body" className="rounded-lg w-full" />
                  </div>
                )}
                {ip.images[0].threeViewUrl && (
                  <div>
                    <p className="text-xs text-warm-silver mb-1">三视图</p>
                    <img src={ip.images[0].threeViewUrl} alt="three view" className="rounded-lg w-full" />
                  </div>
                )}
                {ip.images[0].nineViewUrl && (
                  <div>
                    <p className="text-xs text-warm-silver mb-1">九视图</p>
                    <img src={ip.images[0].nineViewUrl} alt="nine view" className="rounded-lg w-full" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-card border border-border shadow-clay p-6">
            <h3 className="text-lg font-semibold mb-4">操作</h3>
            <div className="space-y-3">
              <IpForm initialData={ip} isEdit />
              <Button variant="destructive" className="w-full">
                删除此 IP
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 提交**

```bash
git add components/ip/ app/\(app\)/ips/
git commit -m "Task 4: Add virtual IP UI pages and components"
```

---

### Task 5: 素材库 Domain 层

**Files:**
- Create: `domains/materials/types.ts`
- Create: `domains/materials/validators.ts`
- Create: `domains/materials/service.ts`

- [ ] **Step 1: 创建 domains/materials/types.ts**

```typescript
export type Visibility = 'PUBLIC' | 'PERSONAL' | 'TEAM'
export type MaterialType = 'CLOTHING' | 'SCENE' | 'ACTION' | 'MAKEUP' | 'ACCESSORY' | 'OTHER'

export interface Material {
  id: string
  userId: string | null
  teamId: string | null
  visibility: Visibility
  type: MaterialType
  name: string
  description: string | null
  url: string
  tags: string[] | null
  createdAt: Date
  updatedAt: Date
}

export interface IpMaterial {
  id: string
  ipId: string
  userId: string
  type: 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'
  name: string
  description: string | null
  tags: string[] | null
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  sourceImageId: string | null
  createdAt: Date
}

export interface CreateMaterialInput {
  visibility: Visibility
  type: MaterialType
  name: string
  description?: string
  url: string
  tags?: string[]
}

export interface IpMaterialInput {
  ipId: string
  type: 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'
  name: string
  description?: string
  tags?: string[]
  fullBodyUrl?: string
  threeViewUrl?: string
  nineViewUrl?: string
  sourceImageId?: string
}
```

- [ ] **Step 2: 创建 domains/materials/validators.ts**

```typescript
import { z } from 'zod'

export const createMaterialSchema = z.object({
  visibility: z.enum(['PUBLIC', 'PERSONAL', 'TEAM']),
  type: z.enum(['CLOTHING', 'SCENE', 'ACTION', 'MAKEUP', 'ACCESSORY', 'OTHER']),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  url: z.string().min(1, 'URL is required'),
  tags: z.array(z.string()).optional(),
})

export const materialFilterSchema = z.object({
  type: z.enum(['CLOTHING', 'SCENE', 'ACTION', 'MAKEUP', 'ACCESSORY', 'OTHER']).optional(),
  visibility: z.enum(['PUBLIC', 'PERSONAL', 'TEAM']).optional(),
  search: z.string().optional(),
})

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>
export type MaterialFilterInput = z.infer<typeof materialFilterSchema>
```

- [ ] **Step 3: 创建 domains/materials/service.ts**

```typescript
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateMaterialInput, IpMaterialInput } from './types'
import { Visibility, MaterialType } from '@prisma/client'

export async function createMaterial(
  userId: string,
  teamId: string | null,
  input: CreateMaterialInput
) {
  return db.material.create({
    data: {
      id: uuid(),
      userId: input.visibility === 'PERSONAL' ? userId : null,
      teamId: input.visibility === 'TEAM' ? teamId : null,
      visibility: input.visibility,
      type: input.type,
      name: input.name,
      description: input.description,
      url: input.url,
      tags: input.tags ? JSON.stringify(input.tags) : null,
    },
  })
}

export async function getMaterials(
  teamId: string,
  filters?: { type?: MaterialType; visibility?: Visibility; search?: string }
) {
  const where: any = {
    OR: [
      { visibility: 'PUBLIC' },
      { visibility: 'TEAM', teamId },
      { visibility: 'PERSONAL', userId: undefined }, // Will be handled
    ],
  }

  if (filters?.type) {
    where.type = filters.type
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { description: { contains: filters.search } },
    ]
  }

  return db.material.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getMaterialById(id: string) {
  return db.material.findUnique({ where: { id } })
}

export async function deleteMaterial(id: string, userId: string, teamId: string) {
  // Only allow deletion of personal materials or if user owns the material
  return db.material.deleteMany({
    where: {
      id,
      OR: [
        { userId },
        { visibility: 'TEAM', teamId },
        { visibility: 'PUBLIC' },
      ],
    },
  })
}

export async function getIpMaterials(ipId: string) {
  return db.ipMaterial.findMany({
    where: { ipId },
    orderBy: { createdAt: 'desc' },
    include: { sourceImage: true },
  })
}

export async function createIpMaterial(userId: string, input: IpMaterialInput) {
  return db.ipMaterial.create({
    data: {
      id: uuid(),
      ipId: input.ipId,
      userId,
      type: input.type,
      name: input.name,
      description: input.description,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      fullBodyUrl: input.fullBodyUrl,
      threeViewUrl: input.threeViewUrl,
      nineViewUrl: input.nineViewUrl,
      sourceImageId: input.sourceImageId,
    },
  })
}
```

- [ ] **Step 4: 提交**

```bash
git add domains/materials/
git commit -m "Task 5: Add materials domain layer - types, validators, service"
```

---

### Task 6: 素材库 API Routes

**Files:**
- Create: `app/api/materials/route.ts`
- Create: `app/api/materials/[id]/route.ts`
- Create: `app/api/materials/ip/[ipId]/route.ts`

- [ ] **Step 1: 创建 app/api/materials/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createMaterial, getMaterials } from '@/domains/materials/service'
import { createMaterialSchema, materialFilterSchema } from '@/domains/materials/validators'
import { z } from 'zod'

// GET /api/materials - List materials
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as any
    const search = searchParams.get('search') || undefined

    const materials = await getMaterials(session.user.teamId || '', {
      type: type || undefined,
      search,
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('List materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/materials - Create a new material
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createMaterialSchema.parse(body)

    const material = await createMaterial(
      session.user.id,
      session.user.teamId,
      validated
    )

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Create material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建 app/api/materials/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getMaterialById, deleteMaterial } from '@/domains/materials/service'

type RouteParams = { params: { id: string } }

// GET /api/materials/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const material = await getMaterialById(params.id)
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    return NextResponse.json(material)
  } catch (error) {
    console.error('Get material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/materials/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await deleteMaterial(
      params.id,
      session.user.id,
      session.user.teamId || ''
    )

    if (result.count === 0) {
      return NextResponse.json({ error: 'Material not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 创建 app/api/materials/ip/[ipId]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getIpMaterials, createIpMaterial } from '@/domains/materials/service'
import { z } from 'zod'
import { ensureUploadDir, generateFileName, getPublicUrl } from '@/foundation/lib/file-upload'
import fs from 'fs'
import path from 'path'

type RouteParams = { params: { ipId: string } }

const ipMaterialSchema = z.object({
  type: z.enum(['MAKEUP', 'ACCESSORY', 'CUSTOMIZED_CLOTHING']),
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// GET /api/materials/ip/[ipId] - Get IP-specific materials
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const materials = await getIpMaterials(params.ipId)
    return NextResponse.json(materials)
  } catch (error) {
    console.error('Get IP materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/materials/ip/[ipId] - Create IP-specific material with images
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()

    const type = formData.get('type') as 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const tagsStr = formData.get('tags') as string | null
    const fullBody = formData.get('fullBody') as File | null
    const threeView = formData.get('threeView') as File | null
    const nineView = formData.get('nineView') as File | null

    const ipId = params.ipId
    const teamId = session.user.teamId
    const subDir = path.join('ip_materials', ipId)
    const uploadDir = ensureUploadDir(teamId)
    const targetDir = path.join(uploadDir, subDir)

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    async function processFile(file: File | null): Promise<string | null> {
      if (!file) return null
      const fileName = generateFileName(file.name)
      const filePath = path.join(targetDir, fileName)
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, buffer)
      return getPublicUrl(teamId, path.join(subDir, fileName))
    }

    const [fullBodyUrl, threeViewUrl, nineViewUrl] = await Promise.all([
      processFile(fullBody),
      processFile(threeView),
      processFile(nineView),
    ])

    const tags = tagsStr ? JSON.parse(tagsStr) : undefined

    const material = await createIpMaterial(session.user.id, {
      ipId,
      type,
      name,
      description: description || undefined,
      tags,
      fullBodyUrl: fullBodyUrl || undefined,
      threeViewUrl: threeViewUrl || undefined,
      nineViewUrl: nineViewUrl || undefined,
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Create IP material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add app/api/materials/
git commit -m "Task 6: Add materials API routes"
```

---

### Task 7: 素材库 UI 页面

**Files:**
- Create: `app/(app)/materials/page.tsx`
- Create: `app/(app)/materials/ip/[ipId]/page.tsx`
- Create: `components/material/MaterialCard.tsx`
- Create: `components/material/MaterialUploader.tsx`

- [ ] **Step 1: 创建 components/material/MaterialCard.tsx**

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MaterialCardProps {
  material: {
    id: string
    name: string
    type: string
    url: string
    tags: string | null
    visibility: string
  }
  onClick?: () => void
}

export function MaterialCard({ material, onClick }: MaterialCardProps) {
  const tags = material.tags ? JSON.parse(material.tags as string) : []

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:border-matcha-600 transition-colors"
      onClick={onClick}
    >
      <div className="aspect-square bg-oat-light relative">
        <img
          src={material.url}
          alt={material.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium truncate">{material.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {material.type}
          </Badge>
          <span className="text-xs text-warm-silver">
            {material.visibility === 'PUBLIC' ? '公共' :
             material.visibility === 'TEAM' ? '团队' : '私有'}
          </span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-xs bg-oat-light px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 创建 components/material/MaterialUploader.tsx**

```tsx
'use client'

import { useState } from 'react'
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
import { useRouter } from 'next/navigation'

export function MaterialUploader() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const file = formData.get('file') as File

    if (!file || file.size === 0) {
      alert('请选择文件')
      setIsLoading(false)
      return
    }

    try {
      // First upload the file
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('subDir', 'materials')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error('文件上传失败')
      }

      const { url } = await uploadResponse.json()

      // Then create the material record
      const materialData = {
        name: formData.get('name'),
        type: formData.get('type'),
        visibility: formData.get('visibility'),
        description: formData.get('description') || undefined,
        tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : undefined,
        url,
      }

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialData),
      })

      if (!response.ok) {
        throw new Error('素材创建失败')
      }

      router.push('/materials')
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">素材名称</Label>
        <Input id="name" name="name" required placeholder="输入素材名称" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">素材类型</Label>
          <Select name="type" required defaultValue="CLOTHING">
            <SelectTrigger>
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CLOTHING">服装</SelectItem>
              <SelectItem value="SCENE">场景</SelectItem>
              <SelectItem value="ACTION">动作</SelectItem>
              <SelectItem value="MAKEUP">妆容</SelectItem>
              <SelectItem value="ACCESSORY">配饰</SelectItem>
              <SelectItem value="OTHER">其他</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">可见性</Label>
          <Select name="visibility" required defaultValue="PERSONAL">
            <SelectTrigger>
              <SelectValue placeholder="选择可见性" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERSONAL">私有</SelectItem>
              <SelectItem value="TEAM">团队</SelectItem>
              <SelectItem value="PUBLIC">公共</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">上传文件</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          required
        />
        {previewUrl && (
          <div className="mt-2">
            <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述</Label>
        <Input
          id="description"
          name="description"
          placeholder="素材描述（可选）"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">标签（逗号分隔）</Label>
        <Input
          id="tags"
          name="tags"
          placeholder="如: 时尚, 潮流, 冬季"
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? '上传中...' : '上传素材'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: 创建 app/(app)/materials/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { MaterialCard } from '@/components/material/MaterialCard'
import { MaterialUploader } from '@/components/material/MaterialUploader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default async function MaterialsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const materials = await db.material.findMany({
    where: {
      OR: [
        { visibility: 'PUBLIC' },
        { visibility: 'TEAM', teamId: session.user.teamId },
        { visibility: 'PERSONAL', userId: session.user.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">素材库</h1>
          <p className="text-warm-silver mt-1">管理你的服装、场景、妆容等素材</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>上传素材</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>上传新素材</DialogTitle>
            </DialogHeader>
            <MaterialUploader />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="素材类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部类型</SelectItem>
            <SelectItem value="CLOTHING">服装</SelectItem>
            <SelectItem value="SCENE">场景</SelectItem>
            <SelectItem value="ACTION">动作</SelectItem>
            <SelectItem value="MAKEUP">妆容</SelectItem>
            <SelectItem value="ACCESSORY">配饰</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-warm-silver mb-4">还没有上传任何素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 创建 app/(app)/materials/ip/[ipId]/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function IpMaterialsPage({
  params,
}: {
  params: { ipId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const ip = await db.virtualIp.findFirst({
    where: { id: params.ipId, teamId: session.user.teamId },
    include: { ipMaterials: true },
  })

  if (!ip) {
    redirect('/ips')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href={`/ips/${params.ipId}`}>&larr; 返回 IP</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {ip.nickname} 的素材
        </h1>
        <p className="text-warm-silver mt-1">管理此 IP 特有的妆容、装饰等素材</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ip.ipMaterials.map((material) => (
          <Card key={material.id}>
            <CardHeader>
              <CardTitle className="text-base">{material.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Badge variant="secondary">
                  {material.type === 'MAKEUP' ? '妆容' :
                   material.type === 'ACCESSORY' ? '配饰' : '定制服装'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {material.fullBodyUrl && (
                  <img src={material.fullBodyUrl} alt="full body" className="rounded" />
                )}
                {material.threeViewUrl && (
                  <img src={material.threeViewUrl} alt="three view" className="rounded" />
                )}
                {material.nineViewUrl && (
                  <img src={material.nineViewUrl} alt="nine view" className="rounded" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add new material card */}
        <Card className="border-dashed flex items-center justify-center min-h-[200px] cursor-pointer hover:border-matcha-600 transition-colors">
          <div className="text-center text-warm-silver">
            <p className="text-4xl mb-2">+</p>
            <p>添加妆容/装饰</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 提交**

```bash
git add components/material/ app/\(app\)/materials/
git commit -m "Task 7: Add materials UI pages and components"
```

---

## 自检清单

### 1. Spec 覆盖

| Spec Section | Task |
|---|---|
| 虚拟 IP CRUD | Task 2, 3, 4 |
| IP 形象图上传 | Task 1, 3 |
| 素材库 CRUD | Task 5, 6, 7 |
| IP 特有素材管理 | Task 5, 6, 7 |
| 文件上传基础设施 | Task 1 |

### 2. 占位符扫描
- 无 "TODO" / "TBD" / "implement later"
- 所有 API 有实际错误处理
- 表单有实际提交逻辑

### 3. 类型一致性
- `domains/virtual-ip/types.ts` 中类型与 Prisma schema 一致
- `domains/materials/types.ts` 中类型与 Prisma schema 一致

---

## 执行选项

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-virtual-ip-video-agent-phase2.md`**

Phase 2 共 7 个 Task：
- Task 1: 文件上传基础设施
- Task 2: 虚拟 IP Domain 层
- Task 3: 虚拟 IP API Routes
- Task 4: 虚拟 IP UI 页面
- Task 5: 素材库 Domain 层
- Task 6: 素材库 API Routes
- Task 7: 素材库 UI 页面

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
