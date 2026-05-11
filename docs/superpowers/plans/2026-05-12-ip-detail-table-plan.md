# IP 详情页表格化改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 IP 详情页的 clips 列表改为表格形式，支持 inline 编辑 thumbnail、title、content，以及 isQualified/isPublished 开关

**Architecture:** 扩展现有 PATCH `/api/video-push/:id` 支持更多字段，前端改造为表格布局

**Tech Stack:** Next.js App Router, React, shadcn/ui, Prisma

---

## 文件结构

```
修改:
- app/api/video-push/[id]/route.ts     # 扩展 PATCH 支持 thumbnail/title/content
- app/(app)/daily-publish-plan/ip/[ipId]/[productId]/page.tsx  # 表格化改造

新增:
- app/api/video-push/batch-update/route.ts  # 批量更新 API（确认按钮）
- components/daily-publish-plan/ClipTable.tsx  # 表格组件
- components/daily-publish-plan/ThumbnailUploader.tsx  # 封面上传组件
```

---

## Task 1: 扩展 PATCH /api/video-push/:id 支持更多字段

**Files:**
- Modify: `app/api/video-push/[id]/route.ts:24-63`

- [ ] **Step 1: 查看当前 PATCH 实现**

当前 PATCH 只支持 `qualified` 和 `published` 字段。需要扩展支持 `thumbnail`、`title`、`content`。

- [ ] **Step 2: 修改 PATCH 处理函数**

更新 body 解析，支持新字段：

```typescript
// PATCH /api/video-push/:id
const { qualified, published, thumbnail, title, content } = body

// 构建 updateData
const updateData: VideoPushUpdateInput = {}
if (typeof qualified === 'boolean') updateData.isQualified = qualified
if (typeof published === 'boolean') updateData.isPublished = published
if (typeof thumbnail === 'string') updateData.thumbnail = thumbnail
if (typeof title === 'string') updateData.title = title
if (typeof content === 'string') updateData.content = content
```

- [ ] **Step 3: 验证 Prisma model 支持这些字段**

`VideoPush` model 已有: `thumbnail`, `title`, `content`, `isQualified`, `isPublished` ✅

- [ ] **Step 4: Commit**

```bash
git add app/api/video-push/[id]/route.ts
git commit -m "feat: extend PATCH /api/video-push/:id to support thumbnail/title/content"
```

---

## Task 2: 创建批量更新 API

**Files:**
- Create: `app/api/video-push/batch-update/route.ts`

- [ ] **Step 1: 创建 batch-update API**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'auth-options'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/video-push/batch-update
// Body: { updates: [{ videoPushId, thumbnail?, title?, content?, isQualified?, isPublished? }] }
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array required' }, { status: 400 })
    }

    // Process each update
    const results = []
    for (const update of updates) {
      const { videoPushId, thumbnail, title, content, isQualified, isPublished } = update

      const updateData: any = {}
      if (typeof thumbnail === 'string') updateData.thumbnail = thumbnail
      if (typeof title === 'string') updateData.title = title
      if (typeof content === 'string') updateData.content = content
      if (typeof isQualified === 'boolean') updateData.isQualified = isQualified
      if (typeof isPublished === 'boolean') updateData.isPublished = isPublished

      if (Object.keys(updateData).length > 0) {
        const updated = await db.videoPush.update({
          where: { id: videoPushId },
          data: updateData,
        })
        results.push(updated)
      }
    }

    return NextResponse.json({ updated: results.length, records: results })
  } catch (error) {
    console.error('Batch update failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/video-push/batch-update/route.ts
git commit -m "feat: add batch update API for video-push"
```

---

## Task 3: 改造页面为表格布局

**Files:**
- Modify: `app/(app)/daily-publish-plan/ip/[ipId]/[productId]/page.tsx`

### 3.1 删除 "添加商品" 对话框

找到并删除 `AddProductDialog` 相关代码（状态、搜索逻辑、对话框组件）

### 3.2 简化顶部按钮区域

删除"选择发布视频 添加商品"区块，保留"编辑"按钮

### 3.3 将 clips 列表改为表格

**表格列：**
| 列 | 字段 | 控件 |
|---|---|---|
| 视频 | url | 封面+点击播放 |
| 音乐 | music_id | 文本展示 |
| 模板 | template_name | 文本展示 |
| 封面图 | thumbnail | 图片/上传 |
| 发布标题 | title | 文本输入 |
| 发布内容 | content | 文本输入 |
| 状态 | status | 标签 |
| 合格 | is_qualified | 复选框 |
| 发布 | is_published | 复选框 |
| 操作 | - | AI填充+确认按钮 |

### 3.4 实现局部状态管理

每行 clip 独立管理编辑状态：
```typescript
interface ClipRowState {
  editingThumbnail: string
  editingTitle: string
  editingContent: string
  isQualified: boolean
  isPublished: boolean
  dirty: boolean  // 有未保存的修改
}
```

### 3.5 确认按钮逻辑

点击确认时，收集所有 dirty 的行，调用 batch-update API

- [ ] **Step 1: 识别需要删除的添加商品相关代码**

找到并记录：
- `addProductDialogOpen` 状态
- `searchQuery`、`activeFilter`、`searchResults` 状态
- `handleOpenAddProductDialog`、`searchProducts`、`handleConfirmAddProduct` 函数
- `AddProductDialog` JSX

- [ ] **Step 2: 删除添加商品对话框相关代码**

- [ ] **Step 3: 实现表格组件结构**

```tsx
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr>
        <th>视频</th>
        <th>音乐</th>
        <th>模板</th>
        <th>封面图</th>
        <th>发布标题</th>
        <th>发布内容</th>
        <th>状态</th>
        <th>合格</th>
        <th>发布</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      {data.clips.map(clip => (
        <ClipRow key={clip.videoPushId} clip={clip} />
      ))}
    </tbody>
  </table>
</div>
```

- [ ] **Step 4: 实现 ClipRow 组件**

每行需要：
- 本地 state 管理编辑值
- 复选框变化时标记 dirty
- 确认按钮提交单个 clip 更新

- [ ] **Step 5: 实现批量确认**

表格底部添加"确认所有修改"按钮，收集所有 dirty 行调用 batch-update

- [ ] **Step 6: 调整顶部按钮布局**

将"剪辑"、"新增"移入合适位置（保留在操作区或 AI 生成视频区域）

- [ ] **Step 7: 测试页面渲染**

启动开发服务器验证表格显示正常

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/daily-publish-plan/ip/\[ipId\]/\[productId\]/page.tsx
git commit -m "feat: transform clips list to table layout with inline editing"
```

---

## Task 4: 实现封面上传功能

**Files:**
- Create: `components/daily-publish-plan/ThumbnailUploader.tsx`

- [ ] **Step 1: 查看现有上传组件**

搜索项目中是否有图片上传组件可复用

- [ ] **Step 2: 创建 ThumbnailUploader 组件**

```tsx
'use client'

import { useState } from 'react'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface ThumbnailUploaderProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
}

export function ThumbnailUploader({ value, onChange, disabled }: ThumbnailUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const { url } = await res.json()
        onChange(url)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative w-16 h-12 rounded overflow-hidden bg-matcha-100">
      {value ? (
        <img src={getImageUrl(value)} alt="thumbnail" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-matcha-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  )
}
```

- [ ] **Step 3: 查看 /api/upload 是否存在**

如果不存在需要创建文件上传 API

- [ ] **Step 4: 在 ClipRow 中集成 ThumbnailUploader**

- [ ] **Step 5: Commit**

```bash
git add components/daily-publish-plan/ThumbnailUploader.tsx
git commit -m "feat: add thumbnail uploader component"
```

---

## Task 5: 验证与测试

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 访问页面**

打开 `/daily-publish-plan/ip/{ipId}?productId={productId}`

- [ ] **Step 3: 验证表格显示**

检查所有列是否正确显示，数据是否正确

- [ ] **Step 4: 测试 inline 编辑**

修改 title/content，确认 dirty 状态

- [ ] **Step 5: 测试确认按钮**

点击确认，验证数据更新到数据库

- [ ] **Step 6: 测试复选框**

切换 isQualified/isPublished，确认状态更新

---

## 自查清单

1. ✅ PATCH 支持 thumbnail/title/content 字段
2. ✅ 批量更新 API 存在
3. ✅ 表格显示 clips 数据
4. ✅ 每列正确绑定字段
5. ✅ 复选框状态可切换
6. ✅ 确认按钮提交更新
7. ✅ 删除"选择发布视频 添加商品"
8. ✅ 顶部按钮布局调整