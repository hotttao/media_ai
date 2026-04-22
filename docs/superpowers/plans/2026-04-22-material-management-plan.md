# 素材库管理功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现动作素材库管理和产品素材库查看功能

**Architecture:**
1. 动作素材 CRUD API + 列表页面
2. 产品素材查看 API + 产品详情页素材 Tab
3. 遵循现有代码风格和模式

**Tech Stack:** Next.js App Router, React, Tailwind CSS

---

## 文件结构

```
app/api/movements/route.ts                    # 动作素材 API（列表+创建）
app/api/movements/[id]/route.ts             # 动作素材 API（详情+更新+删除）
app/(app)/movements/page.tsx                 # 动作素材列表页面
components/movement/MovementCard.tsx          # 动作素材卡片组件
components/movement/MovementForm.tsx          # 动作素材表单组件
app/api/products/[id]/materials/[materialId]/route.ts # 新建，删除产品素材
app/(app)/products/[id]/ProductDetail.tsx      # 修改，添加素材 Tab
```

---

## Task 1: 动作素材 API

**Files:**
- Create: `app/api/movements/route.ts`
- Create: `app/api/movements/[id]/route.ts`
- Modify: `domains/movement-material/service.ts`（添加 update/delete 方法）

### Task 1.1: 更新 movement-material service

- [ ] **Step 1: 添加 updateMovementMaterial 函数**

```typescript
// domains/movement-material/service.ts
export async function updateMovementMaterial(
  id: string,
  input: Partial<CreateMovementMaterialInput>
): Promise<MovementMaterial> {
  return db.movementMaterial.update({
    where: { id },
    data: {
      url: input.url !== undefined ? input.url || null : undefined,
      content: input.content,
      clothing: input.clothing !== undefined ? input.clothing || null : undefined,
      scope: input.scope !== undefined ? input.scope || null : undefined,
    },
  })
}
```

- [ ] **Step 2: 添加 deleteMovementMaterial 函数**

```typescript
export async function deleteMovementMaterial(id: string): Promise<void> {
  await db.movementMaterial.delete({ where: { id } })
}
```

- [ ] **Step 3: 提交**

```bash
git add domains/movement-material/service.ts
git commit -m "feat(movement-material): add update and delete methods"
```

### Task 1.2: 创建 movements API routes

- [ ] **Step 1: 创建 GET/POST handler (app/api/movements/route.ts)**

```typescript
// app/api/movements/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createMovementMaterial, getMovementMaterials } from '@/domains/movement-material/service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const movements = await getMovementMaterials()
    return NextResponse.json(movements)
  } catch (error) {
    console.error('List movements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url, content, clothing, scope } = body

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const movement = await createMovementMaterial({ url, content, clothing, scope })
    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error('Create movement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建 GET/PATCH/DELETE handler (app/api/movements/[id]/route.ts)**

```typescript
// app/api/movements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getMovementMaterialById, updateMovementMaterial, deleteMovementMaterial } from '@/domains/movement-material/service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const movement = await getMovementMaterialById(params.id)
    if (!movement) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(movement)
  } catch (error) {
    console.error('Get movement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const movement = await updateMovementMaterial(params.id, body)
    return NextResponse.json(movement)
  } catch (error) {
    console.error('Update movement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteMovementMaterial(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete movement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add app/api/movements/ domains/movement-material/service.ts
git commit -m "feat: add movements API routes"
```

---

## Task 2: 动作素材列表页面

**Files:**
- Create: `app/(app)/movements/page.tsx`
- Create: `components/movement/MovementCard.tsx`
- Create: `components/movement/MovementForm.tsx`

### Task 2.1: 创建 MovementCard 组件

- [ ] **Step 1: 创建 MovementCard.tsx**

```tsx
// components/movement/MovementCard.tsx
'use client'

import { useState } from 'react'

interface MovementCardProps {
  movement: {
    id: string
    url: string | null
    content: string
    clothing: string | null
    scope: string | null
    createdAt: string
  }
  onEdit: (movement: any) => void
  onDelete: (id: string) => void
}

export function MovementCard({ movement, onEdit, onDelete }: MovementCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 group hover:border-cyan-500/30 transition-all duration-300">
      {/* Video indicator or text indicator */}
      <div className="aspect-video bg-gradient-to-br from-blue-900/40 to-cyan-900/40 flex items-center justify-center">
        {movement.url ? (
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-cyan-400/60 mt-2">视频动作</span>
          </div>
        ) : (
          <div className="text-center px-4">
            <p className="text-sm text-white/60 line-clamp-3">{movement.content}</p>
            <span className="text-xs text-blue-400/60 mt-2">文字动作</span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-4">
        <p className="text-sm text-white/80 line-clamp-2 mb-2">{movement.content}</p>
        {movement.clothing && (
          <p className="text-xs text-white/40">服装: {movement.clothing}</p>
        )}
        {movement.scope && (
          <p className="text-xs text-white/40">适用: {movement.scope}</p>
        )}
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(movement)}
          className="p-2 rounded-lg bg-black/50 text-white/60 hover:text-white hover:bg-black/70"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="p-2 rounded-lg bg-black/50 text-red-400/60 hover:text-red-400 hover:bg-black/70"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Delete confirmation */}
      {showConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl" onClick={() => setShowConfirm(false)}>
          <div className="text-center p-4" onClick={e => e.stopPropagation()}>
            <p className="text-white mb-4">确认删除？</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg bg-white/10 text-white/60">取消</button>
              <button onClick={() => { onDelete(movement.id); setShowConfirm(false) }} className="px-4 py-2 rounded-lg bg-red-600 text-white">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交 MovementCard**

```bash
git add components/movement/MovementCard.tsx
git commit -m "feat: add MovementCard component"
```

### Task 2.2: 创建 MovementForm 组件

- [ ] **Step 1: 创建 MovementForm.tsx**

```tsx
// components/movement/MovementForm.tsx
'use client'

import { useState } from 'react'

interface MovementFormProps {
  movement?: {
    id?: string
    url?: string | null
    content: string
    clothing?: string | null
    scope?: string | null
  }
  onSubmit: (data: { url?: string; content: string; clothing?: string; scope?: string }) => void
  onCancel: () => void
}

export function MovementForm({ movement, onSubmit, onCancel }: MovementFormProps) {
  const [url, setUrl] = useState(movement?.url || '')
  const [content, setContent] = useState(movement?.content || '')
  const [clothing, setClothing] = useState(movement?.clothing || '')
  const [scope, setScope] = useState(movement?.scope || '')
  const [isVideo, setIsVideo] = useState(!!movement?.url)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      url: isVideo && url ? url : undefined,
      content: content.trim(),
      clothing: clothing.trim() || undefined,
      scope: scope.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsVideo(false)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            !isVideo
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
        >
          文字动作
        </button>
        <button
          type="button"
          onClick={() => setIsVideo(true)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            isVideo
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
        >
          视频动作
        </button>
      </div>

      {/* Video URL (if video type) */}
      {isVideo && (
        <div>
          <label className="block text-sm text-white/60 mb-1">视频地址</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      )}

      {/* Content */}
      <div>
        <label className="block text-sm text-white/60 mb-1">
          动作描述 {isVideo ? '(可选)' : '(必填)'}
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="描述动作，如：转身展示背部，双手抚摸头发..."
          rows={3}
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
        />
      </div>

      {/* Clothing */}
      <div>
        <label className="block text-sm text-white/60 mb-1">穿戴服装（可选）</label>
        <input
          type="text"
          value={clothing}
          onChange={e => setClothing(e.target.value)}
          placeholder="如：白色连衣裙"
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Scope */}
      <div>
        <label className="block text-sm text-white/60 mb-1">适合的服装类型（可选）</label>
        <input
          type="text"
          value={scope}
          onChange={e => setScope(e.target.value)}
          placeholder="如：适合转身动作，不适合蹲下"
          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!content.trim() || (isVideo && !url.trim())}
          className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
        >
          {movement?.id ? '更新' : '创建'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: 提交 MovementForm**

```bash
git add components/movement/MovementForm.tsx
git commit -m "feat: add MovementForm component"
```

### Task 2.3: 创建动作素材列表页面

- [ ] **Step 1: 创建 MovementsPage.tsx**

```tsx
// app/(app)/movements/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { MovementCard } from '@/components/movement/MovementCard'
import { MovementForm } from '@/components/movement/MovementForm'

interface Movement {
  id: string
  url: string | null
  content: string
  clothing: string | null
  scope: string | null
  createdAt: string
}

const filterOptions = [
  { value: 'ALL', label: '全部' },
  { value: 'TEXT', label: '文字动作' },
  { value: 'VIDEO', label: '视频动作' },
]

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null)

  const fetchMovements = () => {
    fetch('/api/movements')
      .then(res => res.json())
      .then(data => {
        setMovements(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchMovements()
  }, [])

  const filteredMovements = filter === 'ALL'
    ? movements
    : filter === 'TEXT'
      ? movements.filter(m => !m.url)
      : movements.filter(m => m.url)

  const handleCreate = async (data: any) => {
    const res = await fetch('/api/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setShowForm(false)
      fetchMovements()
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingMovement) return
    const res = await fetch(`/api/movements/${editingMovement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setEditingMovement(null)
      fetchMovements()
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/movements/${id}`, { method: 'DELETE' })
    fetchMovements()
  }

  const handleEdit = (movement: Movement) => {
    setEditingMovement(movement)
    setShowForm(true)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative mb-10 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-cyan-900/30 to-emerald-900/40" />
        <div className="absolute inset-0 backdrop-blur-xl" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

        <div className="relative p-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">动作素材库</h1>
              <p className="text-white/60 mt-1">管理视频生成动作资产</p>
            </div>
          </div>

          <div className="flex gap-8 mt-6">
            <div>
              <span className="text-4xl font-bold text-white">{movements.length}</span>
              <span className="text-white/40 ml-2">个动作</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Add */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 rounded-2xl p-4 mb-8 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {filterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === opt.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEditingMovement(null); setShowForm(true) }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建动作
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-white/40">还没有动作素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMovements.map(movement => (
            <MovementCard
              key={movement.id}
              movement={movement}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingMovement ? '编辑动作' : '创建动作'}
              </h2>
              <MovementForm
                movement={editingMovement || undefined}
                onSubmit={editingMovement ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditingMovement(null) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交页面**

```bash
git add app/(app)/movements/page.tsx
git commit -m "feat: add movements list page"
```

---

## Task 3: 产品素材 API 删除接口

**Files:**
- Create: `app/api/products/[id]/materials/[materialId]/route.ts`

- [ ] **Step 1: 创建 DELETE handler**

```typescript
// app/api/products/[id]/materials/[materialId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    // Verify product belongs to team
    const product = await db.product.findFirst({
      where: { id: params.id, teamId: session.user.teamId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete product material
    await db.productMaterial.delete({
      where: { id: params.materialId, productId: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add app/api/products/[id]/materials/[materialId]/route.ts
git commit -m "feat: add delete product material API"
```

---

## Task 4: 产品详情页素材 Tab

**Files:**
- Modify: `app/(app)/products/[id]/ProductDetail.tsx`（添加素材 Tab）

- [ ] **Step 1: 添加 Tab 状态和素材 Tab 内容**

在 ProductDetail.tsx 中：
1. 添加 `activeTab` state（'detail' | 'materials'）
2. 添加"素材"按钮到 Tab bar
3. 添加 MaterialsTab 组件显示产品素材

```tsx
// 在组件开头添加 state
const [activeTab, setActiveTab] = useState<'detail' | 'materials'>('detail')
const [materials, setMaterials] = useState<ProductMaterial[]>([])
const [materialsLoading, setMaterialsLoading] = useState(false)

// 添加 fetchMaterials 函数
const fetchMaterials = () => {
  setMaterialsLoading(true)
  fetch(`/api/products/${product.id}/materials`)
    .then(res => res.json())
    .then(setMaterials)
    .finally(() => setMaterialsLoading(false))
}

// 在 useEffect 中添加
useEffect(() => {
  if (activeTab === 'materials') {
    fetchMaterials()
  }
}, [activeTab, product.id])
```

- [ ] **Step 2: 添加 Tab bar（在标题下方）**

```tsx
{/* Tab bar */}
<div className="flex gap-4 border-b border-gray-200 mb-8">
  <button
    onClick={() => setActiveTab('detail')}
    className={`pb-3 px-1 text-sm font-medium transition-all ${
      activeTab === 'detail'
        ? 'text-violet-600 border-b-2 border-violet-600'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    商品详情
  </button>
  <button
    onClick={() => setActiveTab('materials')}
    className={`pb-3 px-1 text-sm font-medium transition-all flex items-center gap-2 ${
      activeTab === 'materials'
        ? 'text-violet-600 border-b-2 border-violet-600'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    素材
    {materials.length > 0 && (
      <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-xs">
        {materials.length}
      </span>
    )}
  </button>
</div>
```

- [ ] **Step 3: 添加素材 Tab 内容**

在 Tab bar 后添加：

```tsx
{activeTab === 'materials' ? (
  <MaterialsTab
    materials={materials}
    loading={materialsLoading}
    onDelete={(id) => {
      fetch(`/api/products/${product.id}/materials/${id}`, { method: 'DELETE' })
        .then(() => fetchMaterials())
    }}
  />
) : (
  /* 现有的商品详情内容 */
)}
```

- [ ] **Step 4: 创建 MaterialsTab 组件（内联或单独文件）**

```tsx
// MaterialsTab 组件
function MaterialsTab({
  materials,
  loading,
  onDelete,
}: {
  materials: ProductMaterial[]
  loading: boolean
  onDelete: (id: string) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" /></div>
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        还没有生成任何素材
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 效果图 */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-4">效果图 ({materials.filter(m => m.fullBodyUrl).length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {materials.filter(m => m.fullBodyUrl).map(m => (
            <div key={m.id} className="relative group">
              <img
                src={m.fullBodyUrl}
                alt="效果图"
                className="w-full aspect-[4/5] object-cover rounded-xl cursor-pointer"
                onClick={() => setPreviewUrl(m.fullBodyUrl)}
              />
              <button
                onClick={() => onDelete(m.id)}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 首帧图 */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-4">首帧图 ({materials.filter(m => m.firstFrameUrl).length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {materials.filter(m => m.firstFrameUrl).map(m => (
            <div key={`first-${m.id}`} className="relative group">
              <img
                src={m.firstFrameUrl}
                alt="首帧图"
                className="w-full aspect-video object-cover rounded-xl cursor-pointer"
                onClick={() => setPreviewUrl(m.firstFrameUrl)}
              />
              <button
                onClick={() => onDelete(m.id)}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 提交**

```bash
git add app/(app)/products/[id]/ProductDetail.tsx
git commit -m "feat: add materials tab to product detail page"
```

---

## 实现顺序

1. Task 1: 动作素材 API（service + routes）
2. Task 2: 动作素材列表页面
3. Task 3: 产品素材删除 API
4. Task 4: 产品详情页素材 Tab

---

## 验证清单

- [ ] 动作素材 CRUD API 正常
- [ ] 动作素材列表页面可显示、筛选、创建、编辑、删除
- [ ] 产品素材列表 API 正常
- [ ] 产品详情页素材 Tab 可显示、删除素材
