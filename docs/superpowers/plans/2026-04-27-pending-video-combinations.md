# Pending Video Combinations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add team-scoped APIs for pending first-frame + movement combinations and pose-to-movement maps, then expose a new `未生成组合` tab under `/videos` that browses those pending combinations without triggering real jobs.

**Architecture:** Extend `domains/video/service.ts` as the single source of truth for pending-combination derivation and pose/movement mapping. Keep App Router routes thin and permission-focused, then add dedicated pending-combination UI components so `/videos` can switch between generated videos and pending combinations without overloading the existing `VideoGrid`.

**Tech Stack:** Next.js App Router, React server/client components, Prisma, Vitest, existing movement availability helper

---

## File Structure

**Existing files to modify**

- `domains/video/service.ts`
  Responsibility: derive team-scoped pending combinations and pose/movement map data.
- `domains/video/service.test.ts`
  Responsibility: service-level coverage for pending combinations and pose mappings.
- `domains/api/response-validators.ts`
  Responsibility: OpenAPI response schema definitions for new API payloads.
- `scripts/generate-openapi.ts`
  Responsibility: register and map new response schemas into `docs/openapi.json`.
- `scripts/generate-postman-collection.cjs`
  Responsibility: include new requests and collection variables in Postman output.
- `app/(app)/videos/page.tsx`
  Responsibility: add tab switch between generated videos and pending combinations.

**New files to create**

- `app/api/videos/pending-combinations/route.ts`
  Responsibility: team-scoped pending `firstFrameId + movementId` API.
- `app/api/videos/pose-movement-map/route.ts`
  Responsibility: team-scoped pose-to-movement map API for background task consumers.
- `components/video/PendingCombinationCard.tsx`
  Responsibility: compact card for a single pending first-frame + movement combination.
- `components/video/PendingCombinationGrid.tsx`
  Responsibility: empty/non-empty wrapper for pending-combination lists.
- `components/video/pending-combination-types.ts`
  Responsibility: shared client-side types for pending-combination payloads.

## Task 1: Add Service-Layer Derivation for Pending Combinations and Pose Maps

**Files:**
- Modify: `domains/video/service.ts`
- Modify: `domains/video/service.test.ts`

- [ ] **Step 1: Write the failing service tests**

Add tests to `domains/video/service.test.ts` for both new service exports:

```ts
it('returns pending first-frame and movement combinations not yet present in videos', async () => {
  mockDb.firstFrame.findMany.mockResolvedValue([
    {
      id: 'frame-1',
      url: 'https://cdn/frame-1.jpg',
      productId: 'product-1',
      ipId: 'ip-1',
      styleImageId: 'style-1',
      sceneId: 'scene-1',
      createdAt: new Date('2026-04-27T10:00:00.000Z'),
    },
  ])
  mockDb.styleImage.findMany.mockResolvedValue([
    { id: 'style-1', url: 'https://cdn/style-1.jpg', poseId: 'pose-1' },
  ])
  mockDb.movementMaterial.findMany.mockResolvedValue([
    { id: 'move-general', content: 'turn around', url: null, clothing: null, isGeneral: true, poseIds: [] },
    { id: 'move-pose', content: 'lift skirt', url: null, clothing: null, isGeneral: false, poseIds: ['pose-1'] },
  ])
  mockDb.video.findMany.mockResolvedValue([
    { firstFrameId: 'frame-1', movementId: 'move-general' },
  ])
  mockDb.product.findMany.mockResolvedValue([{ id: 'product-1', name: 'White Skirt' }])
  mockDb.virtualIp.findMany.mockResolvedValue([{ id: 'ip-1', nickname: 'Cui Nianxia' }])
  mockDb.material.findMany.mockResolvedValue([
    { id: 'pose-1', name: 'Front Pose', url: 'https://cdn/pose-1.jpg', prompt: 'front pose' },
    { id: 'scene-1', name: 'Street', url: 'https://cdn/scene-1.jpg', prompt: 'street' },
  ])

  const result = await getPendingVideoCombinations('team-1')

  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({
    combinationKey: 'frame-1:move-pose',
    firstFrame: {
      id: 'frame-1',
      styleImageId: 'style-1',
      poseId: 'pose-1',
    },
    styleImage: {
      id: 'style-1',
      url: 'https://cdn/style-1.jpg',
    },
    movement: {
      id: 'move-pose',
      content: 'lift skirt',
    },
  })
})

it('skips first frames when no pose can be resolved', async () => {
  mockDb.firstFrame.findMany.mockResolvedValue([
    { id: 'frame-1', url: 'https://cdn/frame-1.jpg', productId: 'product-1', ipId: 'ip-1', styleImageId: null, sceneId: null, createdAt: new Date() },
  ])

  const result = await getPendingVideoCombinations('team-1')

  expect(result).toEqual([])
})

it('returns pose movement maps split into general and special movements', async () => {
  mockDb.material.findMany.mockResolvedValue([
    { id: 'pose-1', type: 'POSE', name: 'Front Pose', url: 'https://cdn/pose-1.jpg', teamId: 'team-1' },
  ])
  mockDb.movementMaterial.findMany.mockResolvedValue([
    { id: 'move-general', content: 'turn around', url: null, clothing: null, isGeneral: true, poseIds: [] },
    { id: 'move-special', content: 'lift skirt', url: null, clothing: null, isGeneral: false, poseIds: ['pose-1'] },
  ])

  const result = await getPoseMovementMap('team-1')

  expect(result).toEqual([
    {
      pose: { id: 'pose-1', name: 'Front Pose', url: 'https://cdn/pose-1.jpg' },
      generalMovements: [{ id: 'move-general', content: 'turn around', url: null, clothing: null, isGeneral: true }],
      specialMovements: [{ id: 'move-special', content: 'lift skirt', url: null, clothing: null, isGeneral: false }],
      allMovements: [
        { id: 'move-general', content: 'turn around', url: null, clothing: null, isGeneral: true },
        { id: 'move-special', content: 'lift skirt', url: null, clothing: null, isGeneral: false },
      ],
    },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm.cmd test -- domains/video/service.test.ts
```

Expected:

- `FAIL`
- missing exports for `getPendingVideoCombinations` and `getPoseMovementMap`

- [ ] **Step 3: Write minimal implementation**

Add the two new exports in `domains/video/service.ts`:

```ts
export async function getPendingVideoCombinations(teamId: string) {
  const firstFrames = await db.firstFrame.findMany({
    where: { ipId: { not: null } },
    select: {
      id: true,
      url: true,
      productId: true,
      ipId: true,
      styleImageId: true,
      sceneId: true,
      createdAt: true,
    },
  })

  const styleImageIds = [...new Set(firstFrames.map((item) => item.styleImageId).filter(Boolean))] as string[]
  const styleImages = styleImageIds.length > 0
    ? await db.styleImage.findMany({
        where: { id: { in: styleImageIds } },
        select: { id: true, url: true, poseId: true },
      })
    : []

  const styleImageMap = new Map(styleImages.map((item) => [item.id, item]))
  const poseIds = [...new Set(styleImages.map((item) => item.poseId).filter(Boolean))] as string[]
  const sceneIds = [...new Set(firstFrames.map((item) => item.sceneId).filter(Boolean))] as string[]
  const productIds = [...new Set(firstFrames.map((item) => item.productId).filter(Boolean))] as string[]
  const ipIds = [...new Set(firstFrames.map((item) => item.ipId).filter(Boolean))] as string[]

  const [movements, products, ips, materials, existingVideos] = await Promise.all([
    db.movementMaterial.findMany({
      include: {
        poseLinks: {
          select: { poseId: true },
        },
      },
    }),
    productIds.length > 0 ? db.product.findMany({ where: { id: { in: productIds }, teamId }, select: { id: true, name: true } }) : [],
    ipIds.length > 0 ? db.virtualIp.findMany({ where: { id: { in: ipIds }, teamId }, select: { id: true, nickname: true } }) : [],
    [...poseIds, ...sceneIds].length > 0
      ? db.material.findMany({
          where: { id: { in: [...new Set([...poseIds, ...sceneIds])] } },
          select: { id: true, name: true, url: true, prompt: true },
        })
      : [],
    db.video.findMany({
      where: {
        teamId,
        firstFrameId: { not: null },
        movementId: { not: null },
      },
      select: { firstFrameId: true, movementId: true },
    }),
  ])

  const movementView = movements.map((movement) => ({
    id: movement.id,
    content: movement.content,
    url: movement.url,
    clothing: movement.clothing,
    isGeneral: movement.isGeneral,
    poseIds: movement.poseLinks.map((link) => link.poseId),
  }))

  const existingSet = new Set(existingVideos.map((item) => `${item.firstFrameId}:${item.movementId}`))
  const productMap = new Map(products.map((item) => [item.id, item]))
  const ipMap = new Map(ips.map((item) => [item.id, item]))
  const materialMap = new Map(materials.map((item) => [item.id, item]))

  return firstFrames.flatMap((firstFrame) => {
    const styleImage = firstFrame.styleImageId ? styleImageMap.get(firstFrame.styleImageId) : null
    const poseId = styleImage?.poseId ?? null
    if (!styleImage || !poseId) {
      return []
    }

    const allowed = getAllowedMovementsForPose(movementView, poseId)

    return allowed
      .filter((movement) => !existingSet.has(`${firstFrame.id}:${movement.id}`))
      .map((movement) => ({
        combinationKey: `${firstFrame.id}:${movement.id}`,
        firstFrame: {
          ...firstFrame,
          poseId,
        },
        styleImage: {
          id: styleImage.id,
          url: styleImage.url,
        },
        movement: {
          id: movement.id,
          content: movement.content,
          url: movement.url,
          clothing: movement.clothing,
          isGeneral: movement.isGeneral,
        },
        product: firstFrame.productId ? productMap.get(firstFrame.productId) ?? null : null,
        ip: firstFrame.ipId ? ipMap.get(firstFrame.ipId) ?? null : null,
        pose: materialMap.get(poseId) ?? null,
        scene: firstFrame.sceneId ? materialMap.get(firstFrame.sceneId) ?? null : null,
      }))
  })
}

export async function getPoseMovementMap(teamId: string) {
  const [poses, movements] = await Promise.all([
    db.material.findMany({
      where: {
        type: 'POSE',
        OR: [{ teamId }, { visibility: 'PUBLIC' }],
      },
      select: { id: true, name: true, url: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.movementMaterial.findMany({
      include: {
        poseLinks: {
          select: { poseId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const movementView = movements.map((movement) => ({
    id: movement.id,
    content: movement.content,
    url: movement.url,
    clothing: movement.clothing,
    isGeneral: movement.isGeneral,
    poseIds: movement.poseLinks.map((link) => link.poseId),
  }))

  return poses.map((pose) => {
    const allMovements = getAllowedMovementsForPose(movementView, pose.id)
    return {
      pose,
      generalMovements: allMovements.filter((movement) => movement.isGeneral),
      specialMovements: allMovements.filter((movement) => !movement.isGeneral),
      allMovements,
    }
  })
}
```

Implementation notes:

- Keep the team filter on products and IPs strict.
- Use the same pose availability helper already used by the wizard.
- Skip unresolved `styleImageId -> poseId` chains instead of returning partial pending combinations.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm.cmd test -- domains/video/service.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add domains/video/service.ts domains/video/service.test.ts
git commit -m "feat: derive pending video combinations"
```

## Task 2: Add Team-Scoped Pending Combination and Pose Map APIs

**Files:**
- Create: `app/api/videos/pending-combinations/route.ts`
- Create: `app/api/videos/pose-movement-map/route.ts`
- Modify: `domains/api/response-validators.ts`
- Modify: `scripts/generate-openapi.ts`
- Modify: `scripts/generate-postman-collection.cjs`
- Modify: `docs/openapi.json`
- Modify: `docs/media-ai.postman_collection.json`

- [ ] **Step 1: Write failing route tests**

Extend `app/api/video-routes.test.ts` with two new route cases:

```ts
it('GET /api/videos/pending-combinations returns 401 without session', async () => {
  mockGetServerSession.mockResolvedValue(null)

  const response = await pendingCombinationsGet(new Request('http://localhost:3000/api/videos/pending-combinations'))

  expect(response.status).toBe(401)
})

it('GET /api/videos/pose-movement-map returns mapped data for a team session', async () => {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'user-1', teamId: 'team-1' },
  })
  mockGetPoseMovementMap.mockResolvedValue([{ pose: { id: 'pose-1' }, generalMovements: [], specialMovements: [], allMovements: [] }])

  const response = await poseMovementMapGet(new Request('http://localhost:3000/api/videos/pose-movement-map'))

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual([
    { pose: { id: 'pose-1' }, generalMovements: [], specialMovements: [], allMovements: [] },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm.cmd test -- app/api/video-routes.test.ts
```

Expected:

- `FAIL`
- missing route handlers and mocked service exports

- [ ] **Step 3: Implement thin routes and doc schemas**

Create `app/api/videos/pending-combinations/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getPendingVideoCombinations } from '@/domains/video/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  return NextResponse.json(await getPendingVideoCombinations(session.user.teamId))
}
```

Create `app/api/videos/pose-movement-map/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getPoseMovementMap } from '@/domains/video/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  return NextResponse.json(await getPoseMovementMap(session.user.teamId))
}
```

Add response schemas to `domains/api/response-validators.ts`:

```ts
export const pendingVideoCombinationResponseSchema = z.object({
  combinationKey: z.string(),
  firstFrame: z.object({
    id: z.string(),
    url: z.string(),
    productId: z.string(),
    ipId: z.string(),
    styleImageId: z.string(),
    poseId: z.string(),
    sceneId: z.string().nullable().optional(),
    createdAt: dateTimeSchema,
  }),
  styleImage: z.object({
    id: z.string(),
    url: z.string(),
  }),
  movement: movementMaterialResponseSchema.pick({
    id: true,
    content: true,
    url: true,
    clothing: true,
    isGeneral: true,
  }),
  product: z.object({ id: z.string(), name: z.string() }).nullable(),
  ip: z.object({ id: z.string(), nickname: z.string() }).nullable(),
  pose: materialResponseSchema.pick({ id: true, name: true, url: true }).nullable(),
  scene: materialResponseSchema.pick({ id: true, name: true, url: true }).nullable(),
})

export const poseMovementMapResponseSchema = z.object({
  pose: materialResponseSchema.pick({ id: true, name: true, url: true }),
  generalMovements: z.array(movementMaterialResponseSchema.pick({ id: true, content: true, url: true, clothing: true, isGeneral: true })),
  specialMovements: z.array(movementMaterialResponseSchema.pick({ id: true, content: true, url: true, clothing: true, isGeneral: true })),
  allMovements: z.array(movementMaterialResponseSchema.pick({ id: true, content: true, url: true, clothing: true, isGeneral: true })),
})
```

Register them in `scripts/generate-openapi.ts`, map:

```ts
'/api/videos/pending-combinations': { GET: schemas.PendingVideoCombinationList },
'/api/videos/pose-movement-map': { GET: schemas.PoseMovementMapList },
```

Update Postman generation by adding `videoId` if needed and regenerating outputs instead of manual JSON edits.

- [ ] **Step 4: Run tests and regenerate docs**

Run:

```bash
npm.cmd test -- app/api/video-routes.test.ts
npm run openapi:generate
node scripts\generate-postman-collection.cjs
```

Expected:

- route tests `PASS`
- `docs/openapi.json` now contains `/api/videos/pending-combinations`
- `docs/media-ai.postman_collection.json` now contains both new `GET` requests

- [ ] **Step 5: Commit**

```bash
git add app/api/videos/pending-combinations/route.ts app/api/videos/pose-movement-map/route.ts domains/api/response-validators.ts scripts/generate-openapi.ts scripts/generate-postman-collection.cjs docs/openapi.json docs/media-ai.postman_collection.json app/api/video-routes.test.ts
git commit -m "feat: add pending video combination APIs"
```

## Task 3: Add Pending Combination UI Components

**Files:**
- Create: `components/video/pending-combination-types.ts`
- Create: `components/video/PendingCombinationCard.tsx`
- Create: `components/video/PendingCombinationGrid.tsx`

- [ ] **Step 1: Write failing helper test for pending-combination view state**

Create `components/video/pending-combination-types.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getPendingCombinationTitle } from './pending-combination-types'

describe('getPendingCombinationTitle', () => {
  it('prefers product and movement names for the card title', () => {
    expect(getPendingCombinationTitle({
      product: { id: 'product-1', name: 'White Skirt' },
      movement: { id: 'move-1', content: 'lift skirt' },
    } as any)).toBe('White Skirt · lift skirt')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm.cmd test -- components/video/pending-combination-types.test.ts
```

Expected:

- `FAIL`
- file or helper missing

- [ ] **Step 3: Implement minimal types and cards**

Create `components/video/pending-combination-types.ts`:

```ts
export interface PendingCombinationItem {
  combinationKey: string
  firstFrame: {
    id: string
    url: string
    productId: string
    ipId: string
    styleImageId: string
    poseId: string
    sceneId?: string | null
    createdAt: string
  }
  styleImage: {
    id: string
    url: string
  }
  movement: {
    id: string
    content: string
    url?: string | null
    clothing?: string | null
    isGeneral: boolean
  }
  product?: { id: string; name: string } | null
  ip?: { id: string; nickname: string } | null
  pose?: { id: string; name: string; url: string } | null
  scene?: { id: string; name: string; url: string } | null
}

export function getPendingCombinationTitle(item: Pick<PendingCombinationItem, 'product' | 'movement'>) {
  return `${item.product?.name || '未关联商品'} · ${item.movement.content}`
}
```

Create `PendingCombinationCard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { PendingCombinationItem } from './pending-combination-types'
import { getPendingCombinationTitle } from './pending-combination-types'

export function PendingCombinationCard({ item }: { item: PendingCombinationItem }) {
  const [showNotice, setShowNotice] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex gap-4">
        <img src={item.firstFrame.url} alt={item.movement.content} className="h-28 w-20 rounded-xl object-cover" />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="line-clamp-1 text-base font-semibold text-white">{getPendingCombinationTitle(item)}</h3>
          <p className="text-sm text-white/60">IP: {item.ip?.nickname || '未记录'}</p>
          <p className="text-sm text-white/60">姿势: {item.pose?.name || item.firstFrame.poseId}</p>
          <p className="text-sm text-white/60">定妆图: {item.styleImage.id}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-white/45">{item.combinationKey}</span>
        <button
          type="button"
          onClick={() => setShowNotice(true)}
          className="rounded-xl bg-matcha-600 px-4 py-2 text-sm font-medium text-white hover:bg-matcha-500"
        >
          发起生成
        </button>
      </div>
      {showNotice && (
        <p className="mt-3 rounded-xl bg-black/20 px-3 py-2 text-xs text-white/60">
          任务发起暂未开放，当前版本仅提供待生成组合浏览。
        </p>
      )}
    </div>
  )
}
```

Create `PendingCombinationGrid.tsx`:

```tsx
import type { PendingCombinationItem } from './pending-combination-types'
import { PendingCombinationCard } from './PendingCombinationCard'

export function PendingCombinationGrid({ items }: { items: PendingCombinationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-sm text-white/45">
        当前没有待生成组合
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <PendingCombinationCard key={item.combinationKey} item={item} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm.cmd test -- components/video/pending-combination-types.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add components/video/pending-combination-types.ts components/video/pending-combination-types.test.ts components/video/PendingCombinationCard.tsx components/video/PendingCombinationGrid.tsx
git commit -m "feat: add pending combination video cards"
```

## Task 4: Add `/videos` Tab Switching Between Generated Videos and Pending Combinations

**Files:**
- Modify: `app/(app)/videos/page.tsx`
- Reuse: `components/video/VideoGrid.tsx`
- Reuse: `components/video/PendingCombinationGrid.tsx`
- Reuse: `components/video/pending-combination-types.ts`

- [ ] **Step 1: Write failing page-state helper test**

Create `app/(app)/videos/videos-page-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getVideoTabSummary } from './videos-page-state'

describe('getVideoTabSummary', () => {
  it('reports separate counts for generated videos and pending combinations', () => {
    expect(getVideoTabSummary({ videos: 3, pending: 5 })).toEqual({
      generatedCount: 3,
      pendingCount: 5,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm.cmd test -- "app/(app)/videos/videos-page-state.test.ts"
```

Expected:

- `FAIL`
- helper missing

- [ ] **Step 3: Implement minimal tabbed page**

Create `app/(app)/videos/videos-page-state.ts`:

```ts
export function getVideoTabSummary(input: { videos: number; pending: number }) {
  return {
    generatedCount: input.videos,
    pendingCount: input.pending,
  }
}
```

Then convert `app/(app)/videos/page.tsx` into a server-wrapper plus client tab switch if needed. The simplest split is:

- keep server fetches in `page.tsx`
- add an inline client child component or new `VideosPageClient.tsx`

Use this server-side fetch:

```tsx
const [videos, pendingCombinations] = await Promise.all([
  getVideosByTeam(session.user.teamId),
  getPendingVideoCombinations(session.user.teamId),
])
```

Client rendering shape:

```tsx
'use client'

import { useState } from 'react'
import { VideoGrid } from '@/components/video/VideoGrid'
import { PendingCombinationGrid } from '@/components/video/PendingCombinationGrid'

export function VideosPageClient({
  videos,
  pendingCombinations,
}: {
  videos: VideoListItem[]
  pendingCombinations: PendingCombinationItem[]
}) {
  const [activeTab, setActiveTab] = useState<'generated' | 'pending'>('generated')

  return (
    <div className="space-y-6">
      <div className="flex gap-3 border-b border-white/10">
        <button ...>已生成视频</button>
        <button ...>未生成组合</button>
      </div>

      {activeTab === 'generated' ? (
        <VideoGrid
          videos={videos}
          emptyTitle="当前还没有任何已生成视频"
          emptyDescription="先从商品详情页生成或上传视频，这里会自动汇总展示。"
          emptyActionHref="/products"
          emptyActionLabel="去商品页生成视频"
        />
      ) : (
        <PendingCombinationGrid items={pendingCombinations} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the targeted tests**

Run:

```bash
npm.cmd test -- "app/(app)/videos/videos-page-state.test.ts"
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add app/(app)/videos/page.tsx app/(app)/videos/videos-page-state.ts app/(app)/videos/videos-page-state.test.ts components/video/PendingCombinationGrid.tsx
git commit -m "feat: add pending combinations tab to videos page"
```

## Final Verification

- [ ] **Step 1: Run targeted test batch**

Run:

```bash
npm.cmd test -- domains/video/service.test.ts app/api/video-routes.test.ts components/video/pending-combination-types.test.ts "app/(app)/videos/videos-page-state.test.ts"
```

Expected:

- all listed tests `PASS`

- [ ] **Step 2: Regenerate docs and verify route presence**

Run:

```bash
npm run openapi:generate
node scripts\generate-postman-collection.cjs
```

Expected:

- `docs/openapi.json` contains:
  - `/api/videos/pending-combinations`
  - `/api/videos/pose-movement-map`
- `docs/media-ai.postman_collection.json` contains both GET requests

- [ ] **Step 3: Run build smoke check**

Run:

```bash
./node_modules/.bin/next.cmd build
```

Expected:

- `Compiled successfully`

- [ ] **Step 4: Manual browser checklist**

Verify:

- `/videos` loads generated-video tab by default
- switching to `未生成组合` shows first-frame + movement cards
- clicking `发起生成` only shows placeholder feedback, does not create a task
- `/api/videos/pending-combinations` returns `styleImageId`, `poseId`, and `styleImage.url`
- `/api/videos/pose-movement-map` returns current-team pose mappings

- [ ] **Step 5: Final commit if verification caused fixups**

```bash
git add -A
git commit -m "test: verify pending video combination flows"
```

## Self-Review

### Spec Coverage

- Pending combination API: covered by Tasks 1 and 2
- Pose-to-movement map API: covered by Tasks 1 and 2
- `styleImageId`, `poseId`, and `styleImage.url` in pending payload: covered by Task 1 test + Task 2 schemas
- `/videos` pending tab: covered by Tasks 3 and 4
- No real task execution yet: enforced in Task 3 placeholder button behavior and Task 4 UI

### Placeholder Scan

- No `TODO` / `TBD` markers remain
- Every task includes explicit files, commands, and implementation snippets
- No cross-task “same as above” shortcuts were used

### Type Consistency

- `combinationKey`, `styleImageId`, `poseId`, and `styleImage.url` use the same names throughout tests, services, schemas, and UI
- The pending API path is consistently `/api/videos/pending-combinations`
- The pose-map API path is consistently `/api/videos/pose-movement-map`
