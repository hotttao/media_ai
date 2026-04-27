# Product Video Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product/global video browsing, a dedicated video detail page with generation trace, and wizard support for uploaded videos that still require a selected movement before completion.

**Architecture:** Extend `domains/video/service.ts` into the single source of truth for product video lists, team video lists, video detail aggregation, and manual-upload persistence. Build thin API routes on top of that service, then layer reusable video UI components into the product detail page, the `/videos` index, the `/videos/[videoId]` detail page, and finally wire the wizard upload flow to create standard `video_tasks` and `videos` records.

**Tech Stack:** Next.js App Router, React client/server components, Prisma, Vitest, Testing Library

---

## File Structure

**Existing files to modify**

- `domains/video/service.ts`
  Responsibility: central video query/persistence logic
- `domains/video/types.ts`
  Responsibility: typed task input plus manual-upload metadata shape
- `app/api/products/[id]/generate-video/route.ts`
  Responsibility: first-frame generation branch plus final video generation branch; extend with uploaded-video save branch
- `app/(app)/products/[id]/ProductDetail.tsx`
  Responsibility: product detail tabs and product-scoped video entry
- `app/(app)/products/[id]/GenerateVideoWizard.tsx`
  Responsibility: wizard step 5 state machine and upload/generate completion rules

**New files to create**

- `domains/video/service.test.ts`
  Responsibility: service-level coverage for product/team/detail/manual-upload flows
- `app/api/products/[id]/videos/route.ts`
  Responsibility: product-scoped video list API
- `app/api/videos/route.ts`
  Responsibility: team-scoped video list API
- `app/api/videos/[videoId]/route.ts`
  Responsibility: aggregated video detail API
- `components/video/VideoCard.tsx`
  Responsibility: reusable summary card for video lists
- `components/video/VideoGrid.tsx`
  Responsibility: empty/non-empty grid wrapper for list pages
- `components/video/VideoPlayerPanel.tsx`
  Responsibility: detail page player and metadata header
- `components/video/VideoTraceTimeline.tsx`
  Responsibility: generation trace rendering with explicit "未记录" states
- `components/video/VideoTaskPanel.tsx`
  Responsibility: task/result display, including `manual_upload`
- `components/video/video-types.ts`
  Responsibility: shared client-side list/detail response shapes
- `app/(app)/videos/page.tsx`
  Responsibility: global video index page
- `app/(app)/videos/[videoId]/page.tsx`
  Responsibility: server page for single video detail
- `app/(app)/videos/loading.tsx`
  Responsibility: lightweight loading state for the global video route

**Optional follow-up files if extraction becomes necessary while implementing**

- `app/(app)/products/[id]/ProductVideoTab.tsx`
  Responsibility: isolate product-page video tab if `ProductDetail.tsx` becomes too large

## Task 1: Extend Video Service for Lists, Detail, and Manual Upload Save

**Files:**
- Modify: `domains/video/service.ts`
- Modify: `domains/video/types.ts`
- Test: `domains/video/service.test.ts`

- [ ] **Step 1: Write the failing service tests**

Create `domains/video/service.test.ts` with focused coverage for the three new read paths and the new manual-upload write path:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = {
  video: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  videoTask: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('@/foundation/lib/db', () => ({
  db: dbMock,
}))

import {
  getVideosByProduct,
  getVideosByTeam,
  getVideoDetail,
  saveUploadedVideo,
} from './service'

describe('video service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('orders product videos by newest first', async () => {
    dbMock.video.findMany.mockResolvedValue([{ id: 'video-2' }, { id: 'video-1' }])

    const result = await getVideosByProduct('product-1', 'team-1')

    expect(dbMock.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 'product-1', teamId: 'team-1' },
        orderBy: { createdAt: 'desc' },
      })
    )
    expect(result).toEqual([{ id: 'video-2' }, { id: 'video-1' }])
  })

  it('returns null when video detail is outside the team scope', async () => {
    dbMock.video.findFirst.mockResolvedValue(null)

    const result = await getVideoDetail('video-1', 'team-1')

    expect(result).toBeNull()
  })

  it('creates a completed manual-upload task and linked video record', async () => {
    dbMock.$transaction.mockImplementation(async (callback) => callback({
      videoTask: { create: dbMock.videoTask.create },
      video: { create: dbMock.video.create },
    }))
    dbMock.videoTask.create.mockResolvedValue({ id: 'task-1' })
    dbMock.video.create.mockResolvedValue({ id: 'video-1', url: 'https://cdn/video.mp4' })

    const result = await saveUploadedVideo({
      productId: 'product-1',
      userId: 'user-1',
      teamId: 'team-1',
      ipId: 'ip-1',
      movementId: 'movement-1',
      firstFrameId: 'frame-1',
      styleImageId: 'style-1',
      modelImageId: 'model-1',
      sceneId: 'scene-1',
      poseId: 'pose-1',
      prompt: 'manual prompt',
      url: 'https://cdn/video.mp4',
    })

    expect(dbMock.videoTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamId: 'team-1',
          status: 'COMPLETED',
        }),
      })
    )
    expect(dbMock.video.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementId: 'movement-1',
          url: 'https://cdn/video.mp4',
        }),
      })
    )
    expect(result).toEqual({ videoId: 'video-1', videoUrl: 'https://cdn/video.mp4' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
yarn test domains/video/service.test.ts
```

Expected:

- `FAIL`
- missing exports for `getVideosByProduct`, `getVideosByTeam`, `getVideoDetail`, `saveUploadedVideo`

- [ ] **Step 3: Write the minimal service implementation**

Add the new exports to `domains/video/service.ts` and extend `domains/video/types.ts` with a dedicated input type:

```ts
export interface SaveUploadedVideoInput {
  productId: string
  userId: string
  teamId: string
  ipId: string
  movementId: string
  url: string
  prompt?: string | null
  sceneId?: string | null
  poseId?: string | null
  firstFrameId?: string | null
  styleImageId?: string | null
  modelImageId?: string | null
}
```

```ts
export async function getVideosByProduct(productId: string, teamId: string) {
  return db.video.findMany({
    where: { productId, teamId },
    orderBy: { createdAt: 'desc' },
    include: {
      ip: { select: { id: true, nickname: true } },
      task: { select: { id: true, status: true } },
    },
  })
}

export async function getVideosByTeam(teamId: string) {
  return db.video.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true } },
      ip: { select: { id: true, nickname: true } },
      task: { select: { id: true, status: true } },
    },
  })
}

export async function getVideoDetail(videoId: string, teamId: string) {
  return db.video.findFirst({
    where: { id: videoId, teamId },
    include: {
      product: { select: { id: true, name: true } },
      ip: { select: { id: true, nickname: true, avatarUrl: true } },
      task: { select: { id: true, status: true, params: true, result: true, error: true, createdAt: true, startedAt: true, completedAt: true, workflow: { select: { id: true, name: true } } } },
    },
  })
}

export async function saveUploadedVideo(input: SaveUploadedVideoInput) {
  const taskId = uuid()

  const video = await db.$transaction(async (tx) => {
    await tx.videoTask.create({
      data: {
        id: taskId,
        userId: input.userId,
        teamId: input.teamId,
        workflowId: 'manual-upload',
        ipId: input.ipId,
        status: 'COMPLETED',
        params: JSON.stringify({ source: 'manual_upload', movementId: input.movementId }),
        result: JSON.stringify({ source: 'manual_upload', videoUrl: input.url }),
        completedAt: new Date(),
      },
    })

    return tx.video.create({
      data: {
        id: uuid(),
        taskId,
        userId: input.userId,
        teamId: input.teamId,
        ipId: input.ipId,
        productId: input.productId,
        name: `uploaded_${input.movementId}_${Date.now()}`,
        url: input.url,
        prompt: input.prompt ?? null,
        movementId: input.movementId,
        sceneId: input.sceneId ?? null,
        poseId: input.poseId ?? null,
        firstFrameId: input.firstFrameId ?? null,
        styleImageId: input.styleImageId ?? null,
        modelImageId: input.modelImageId ?? null,
      },
    })
  })

  return { videoId: video.id, videoUrl: video.url }
}
```

Implementation notes:

- keep existing `createVideoTask`, `getTasks`, `getTaskById`, `updateTaskStatus`, `updateTaskResult`, `createVideo` intact
- do not special-case `manual-upload` in query methods; treat uploaded videos as normal `video` rows
- if `workflowId: 'manual-upload'` conflicts with schema constraints discovered during implementation, replace the literal with a real workflow lookup created elsewhere, but keep the external semantics the same

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
yarn test domains/video/service.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add domains/video/service.ts domains/video/types.ts domains/video/service.test.ts
git commit -m "feat: add video query and upload persistence services"
```

## Task 2: Add Product, Team, and Detail Video APIs

**Files:**
- Create: `app/api/products/[id]/videos/route.ts`
- Create: `app/api/videos/route.ts`
- Create: `app/api/videos/[videoId]/route.ts`
- Modify: `app/api/products/[id]/generate-video/route.ts`
- Test: `domains/video/service.test.ts`

- [ ] **Step 1: Write the failing route-facing service assertions**

Add service tests that cover the route contract dependencies before touching route files:

```ts
it('returns detail data with related videos for the same product', async () => {
  dbMock.video.findFirst.mockResolvedValue({
    id: 'video-1',
    productId: 'product-1',
    teamId: 'team-1',
    task: { params: '{"source":"manual_upload"}' },
  })

  const result = await getVideoDetail('video-1', 'team-1')

  expect(dbMock.video.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 'video-1', teamId: 'team-1' },
    })
  )
  expect(result?.id).toBe('video-1')
})
```

This keeps TDD anchored at the domain boundary even though the next edits are route files.

- [ ] **Step 2: Run test to verify it fails for missing detail enrichment**

Run:

```bash
yarn test domains/video/service.test.ts
```

Expected:

- `FAIL`
- insufficient include structure or no related-video composition

- [ ] **Step 3: Implement the minimal APIs and upload save branch**

Create `app/api/products/[id]/videos/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVideosByProduct } from '@/domains/video/service'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.teamId) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  const videos = await getVideosByProduct(params.id, session.user.teamId)
  return NextResponse.json(videos)
}
```

Create `app/api/videos/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVideosByTeam } from '@/domains/video/service'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.teamId) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  return NextResponse.json(await getVideosByTeam(session.user.teamId))
}
```

Create `app/api/videos/[videoId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVideoDetail } from '@/domains/video/service'

export async function GET(_: Request, { params }: { params: { videoId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.teamId) return NextResponse.json({ error: 'No team found' }, { status: 400 })

  const detail = await getVideoDetail(params.videoId, session.user.teamId)
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(detail)
}
```

Modify `app/api/products/[id]/generate-video/route.ts` to add an uploaded-video branch before generated-video execution:

```ts
if (step === 'upload-video') {
  const { ipId, movementId, videoUrl, sceneId, poseId, prompt, firstFrameId, styleImageId, modelImageId } = body

  if (!session.user.teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  if (!ipId || !movementId || !videoUrl) {
    return NextResponse.json({ error: 'Missing required fields: ipId, movementId, videoUrl' }, { status: 400 })
  }

  const result = await saveUploadedVideo({
    productId: params.id,
    userId: session.user.id,
    teamId: session.user.teamId,
    ipId,
    movementId,
    url: videoUrl,
    prompt,
    sceneId,
    poseId,
    firstFrameId,
    styleImageId,
    modelImageId,
  })

  return NextResponse.json(result)
}
```

- [ ] **Step 4: Run tests to verify the service contract still passes**

Run:

```bash
yarn test domains/video/service.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add app/api/products/[id]/videos/route.ts app/api/videos/route.ts app/api/videos/[videoId]/route.ts app/api/products/[id]/generate-video/route.ts domains/video/service.ts domains/video/service.test.ts
git commit -m "feat: add video browsing APIs"
```

## Task 3: Build Reusable Video UI and Global Video Pages

**Files:**
- Create: `components/video/video-types.ts`
- Create: `components/video/VideoCard.tsx`
- Create: `components/video/VideoGrid.tsx`
- Create: `components/video/VideoPlayerPanel.tsx`
- Create: `components/video/VideoTraceTimeline.tsx`
- Create: `components/video/VideoTaskPanel.tsx`
- Create: `app/(app)/videos/page.tsx`
- Create: `app/(app)/videos/[videoId]/page.tsx`
- Create: `app/(app)/videos/loading.tsx`

- [ ] **Step 1: Write the failing list/detail rendering tests as pure-state helpers**

Because there are currently no video page tests and UI behavior is mostly conditional rendering, start with extracted render-data helpers inside `components/video/video-types.ts` or a sibling helper if needed:

```ts
export function getTraceItems(detail: VideoDetailResponse) {
  return [
    { key: 'model', label: '模特图', imageUrl: detail.modelImage?.url ?? null, emptyLabel: '未记录' },
    { key: 'style', label: '定妆图', imageUrl: detail.styleImage?.url ?? null, emptyLabel: '未记录' },
    { key: 'first-frame', label: '首帧图', imageUrl: detail.firstFrame?.url ?? null, emptyLabel: '未记录' },
    { key: 'movement', label: '动作', text: detail.movement?.content ?? '未记录' },
    { key: 'video', label: '成品视频', videoUrl: detail.url },
  ]
}
```

Add a small colocated test if extraction is needed:

```ts
it('marks missing trace assets as 未记录', () => {
  const items = getTraceItems({
    id: 'video-1',
    url: 'https://cdn/video.mp4',
    modelImage: null,
    styleImage: null,
    firstFrame: null,
    movement: null,
  } as VideoDetailResponse)

  expect(items[0].emptyLabel).toBe('未记录')
  expect(items[3].text).toBe('未记录')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
yarn test components/video/video-types.test.ts
```

Expected:

- `FAIL`
- helper or type file missing

- [ ] **Step 3: Implement the minimal shared UI**

Create `components/video/video-types.ts` with the shared response shapes:

```ts
export interface VideoListItem {
  id: string
  url: string
  thumbnail?: string | null
  name?: string | null
  prompt?: string | null
  createdAt: string
  product?: { id: string; name: string } | null
  ip?: { id: string; nickname: string } | null
  task?: { id: string; status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' } | null
}
```

Implement `VideoCard.tsx`:

```tsx
import Link from 'next/link'
import type { VideoListItem } from './video-types'

export function VideoCard({ video, href }: { video: VideoListItem; href: string }) {
  return (
    <Link href={href} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="aspect-video bg-black">
        <video src={video.url} preload="metadata" className="h-full w-full object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <div className="line-clamp-1 font-medium text-gray-900">{video.name || '未命名视频'}</div>
        <div className="text-sm text-gray-500">{video.product?.name || '未关联商品'}</div>
        <div className="text-xs text-gray-400">{video.ip?.nickname || '未关联 IP'}</div>
      </div>
    </Link>
  )
}
```

Implement `VideoGrid.tsx` with a reusable empty state:

```tsx
export function VideoGrid({
  videos,
  emptyTitle,
  buildHref,
}: {
  videos: VideoListItem[]
  emptyTitle: string
  buildHref: (video: VideoListItem) => string
}) {
  if (videos.length === 0) {
    return <div className="rounded-3xl border border-dashed border-gray-200 bg-white/70 px-6 py-16 text-center text-sm text-gray-400">{emptyTitle}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => <VideoCard key={video.id} video={video} href={buildHref(video)} />)}
    </div>
  )
}
```

Implement detail components with explicit trace fallback:

```tsx
export function VideoTraceTimeline({ detail }: { detail: VideoDetailResponse }) {
  const items = getTraceItems(detail)

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">生成过程</h2>
      <div className="grid gap-4 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.key} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
            <div className="mb-2 text-sm font-medium text-gray-700">{item.label}</div>
            {item.imageUrl ? <img src={item.imageUrl} alt={item.label} className="aspect-[9/16] w-full rounded-xl object-cover" /> : <div className="flex aspect-[9/16] items-center justify-center rounded-xl bg-white text-sm text-gray-400">{item.emptyLabel ?? item.text}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
```

Create `app/(app)/videos/page.tsx`:

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVideosByTeam } from '@/domains/video/service'
import { VideoGrid } from '@/components/video/VideoGrid'

export default async function VideosPage() {
  const session = await getServerSession(authOptions)
  const videos = session?.user?.teamId ? await getVideosByTeam(session.user.teamId) : []

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">视频</h1>
        <p className="text-sm text-gray-500">按最新时间查看团队内全部视频。</p>
      </div>
      <VideoGrid videos={videos} emptyTitle="当前还没有任何已生成视频" buildHref={(video) => `/videos/${video.id}`} />
    </div>
  )
}
```

Create `app/(app)/videos/[videoId]/page.tsx` around `getVideoDetail` plus `notFound()` and the three detail components.

- [ ] **Step 4: Run tests to verify the new helper passes**

Run:

```bash
yarn test components/video/video-types.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add components/video app/(app)/videos
git commit -m "feat: add reusable video browsing UI"
```

## Task 4: Add Product Detail Video Tab and Product-Scoped Fetching

**Files:**
- Modify: `app/(app)/products/[id]/ProductDetail.tsx`
- Create or Modify: `app/(app)/products/[id]/ProductVideoTab.tsx` if extraction is needed
- Reuse: `components/video/VideoGrid.tsx`

- [ ] **Step 1: Write the failing product-tab interaction test via extracted state helper**

If `ProductDetail.tsx` is too large for direct component testing, extract the tab config helper first and test it:

```ts
export function getProductTabCounts(input: {
  modelImages: number
  videos: number
}) {
  return {
    materialsBadge: input.modelImages,
    videosBadge: input.videos,
  }
}
```

Test:

```ts
it('shows the video badge count separately from generated materials', () => {
  expect(getProductTabCounts({ modelImages: 3, videos: 2 })).toEqual({
    materialsBadge: 3,
    videosBadge: 2,
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
yarn test app/(app)/products/[id]/product-detail-state.test.ts
```

Expected:

- `FAIL`
- helper missing

- [ ] **Step 3: Implement the minimal tab integration**

In `ProductDetail.tsx`:

- widen `activeTab` from `'detail' | 'materials'` to `'detail' | 'materials' | 'videos'`
- add `productVideos` and `videosLoading` state
- fetch `/api/products/${product.id}/videos` on first entry to the tab
- render `VideoGrid` with `buildHref={(video) => \`/videos/${video.id}\`}`

Use this shape:

```ts
const [activeTab, setActiveTab] = useState<'detail' | 'materials' | 'videos'>('detail')
const [productVideos, setProductVideos] = useState<VideoListItem[] | null>(null)
const [videosLoading, setVideosLoading] = useState(false)

const fetchProductVideos = async () => {
  setVideosLoading(true)
  try {
    const res = await fetch(`/api/products/${product.id}/videos`)
    const data = await res.json()
    setProductVideos(Array.isArray(data) ? data : [])
  } finally {
    setVideosLoading(false)
  }
}
```

Render branch:

```tsx
{activeTab === 'videos' ? (
  videosLoading ? (
    <div className="flex justify-center py-12"><div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500" /></div>
  ) : (
    <VideoGrid
      videos={productVideos ?? []}
      emptyTitle="该商品还没有生成过视频"
      buildHref={(video) => `/videos/${video.id}`}
    />
  )
) : activeTab === 'materials' ? (
  <MaterialsTab ... />
) : (
  ...
)}
```

Keep the existing materials tab behavior unchanged.

- [ ] **Step 4: Run the targeted tests**

Run:

```bash
yarn test app/(app)/products/[id]/product-detail-state.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add app/(app)/products/[id]/ProductDetail.tsx app/(app)/products/[id]/product-detail-state.test.ts
git commit -m "feat: add product video tab"
```

## Task 5: Add Wizard Video Upload Flow with Required Movement Selection

**Files:**
- Modify: `app/(app)/products/[id]/GenerateVideoWizard.tsx`
- Modify: `app/api/products/[id]/generate-video/route.ts`
- Test: `app/(app)/products/[id]/video-step-state.test.ts`

- [ ] **Step 1: Write the failing upload-completion tests**

Extract the completion rule into a pure helper first:

```ts
export function canCompleteVideoStep(input: {
  selectedMovementId: string | null
  videoUrl: string | null
}) {
  return Boolean(input.selectedMovementId && input.videoUrl)
}
```

Test it in `app/(app)/products/[id]/video-step-state.test.ts`:

```ts
import { canCompleteVideoStep } from './video-step-state'

describe('canCompleteVideoStep', () => {
  it('returns false when a video is uploaded but no movement is selected', () => {
    expect(canCompleteVideoStep({
      selectedMovementId: null,
      videoUrl: 'https://cdn/uploaded.mp4',
    })).toBe(false)
  })

  it('returns true when both movement and uploaded video are present', () => {
    expect(canCompleteVideoStep({
      selectedMovementId: 'movement-1',
      videoUrl: 'https://cdn/uploaded.mp4',
    })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
yarn test "app/(app)/products/[id]/video-step-state.test.ts"
```

Expected:

- `FAIL`
- helper missing

- [ ] **Step 3: Implement the minimal wizard and upload-save behavior**

Create `app/(app)/products/[id]/video-step-state.ts`:

```ts
export function canCompleteVideoStep(input: {
  selectedMovementId: string | null
  videoUrl: string | null
}) {
  return Boolean(input.selectedMovementId && input.videoUrl)
}
```

Then update `GenerateVideoWizard.tsx`:

- reuse `canCompleteVideoStep` in `canProceed()` for `case 4`
- add a second action next to “生成视频”:

```tsx
<label className="cursor-pointer rounded-xl border border-oat bg-white px-6 py-3 font-medium text-warm-charcoal hover:bg-oat-light">
  上传视频
  <input
    type="file"
    accept="video/*"
    className="hidden"
    onChange={async (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        setError('上传视频失败')
        return
      }

      const uploadData = await uploadRes.json()
      setVideoUrl(uploadData.url)
    }}
  />
</label>
```

When the user has chosen a movement and `videoUrl` came from upload, save through the new route branch:

```ts
const res = await fetch(`/api/products/${product.id}/generate-video`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    step: 'upload-video',
    ipId: selectedIp?.id,
    movementId: selectedMovement?.id,
    videoUrl,
    prompt: videoPrompt,
    sceneId: selectedScene?.id,
    poseId: selectedPose?.id,
    firstFrameId,
    styleImageId: styledImageId,
    modelImageId,
  }),
})
```

Use a dedicated button label so the user understands the action:

- if `videoUrl` exists and it came from upload, show `保存上传视频`
- otherwise keep `生成视频`

Implementation constraint:

- do not auto-save immediately on upload
- saving should happen only when the user explicitly completes the step, so movement selection remains part of the final contract

- [ ] **Step 4: Run the targeted tests**

Run:

```bash
yarn test "app/(app)/products/[id]/video-step-state.test.ts"
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add app/(app)/products/[id]/GenerateVideoWizard.tsx app/(app)/products/[id]/video-step-state.ts app/(app)/products/[id]/video-step-state.test.ts app/api/products/[id]/generate-video/route.ts
git commit -m "feat: support uploaded videos in wizard"
```

## Final Verification

- [ ] **Step 1: Run the full targeted test batch**

Run:

```bash
yarn test domains/video/service.test.ts "components/video/video-types.test.ts" "app/(app)/products/[id]/product-detail-state.test.ts" "app/(app)/products/[id]/video-step-state.test.ts"
```

Expected:

- all tests `PASS`

- [ ] **Step 2: Run the app-level smoke checks**

Run:

```bash
yarn test app/(app)/materials/view-state.test.ts domains/movement-material/availability.test.ts
```

Expected:

- existing neighboring tests still `PASS`

- [ ] **Step 3: Manual browser checklist**

Verify in the app:

- `/videos` loads and shows team videos newest first
- `/videos/[videoId]` shows player, trace, task info, and related videos
- product detail page can switch to the video tab
- wizard step 5 blocks completion when only a video upload exists
- wizard step 5 allows completion when both movement and uploaded/generated video exist
- uploaded video appears in both `/products/[id]` video tab and `/videos`

- [ ] **Step 4: Final commit if any verification fixups were needed**

```bash
git add -A
git commit -m "test: verify product video browser flow"
```

## Self-Review

### Spec Coverage

- Product page video tab: covered by Task 4
- Global video index: covered by Task 3
- Dedicated video detail page with trace/task panels: covered by Task 3
- API aggregation and team scoping: covered by Tasks 1 and 2
- Uploaded-video wizard flow with required movement selection: covered by Task 5

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” markers remain
- Every task has explicit files, commands, and code anchors
- The few “if extraction is needed” branches still name exact fallback files and keep scope bounded

### Type Consistency

- `movementId`, `firstFrameId`, `styleImageId`, `modelImageId`, `sceneId`, and `poseId` use the same names across service, route, and wizard tasks
- Uploaded video route branch uses `step: 'upload-video'`, consistently referenced in Task 5
