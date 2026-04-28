import { NextRequest } from 'next/server'

const mockGetServerSession = vi.hoisted(() => vi.fn())
const mockGenerateFirstFrame = vi.hoisted(() => vi.fn())
const mockGenerateVideo = vi.hoisted(() => vi.fn())
const mockIsSceneAllowedForProductAndIp = vi.hoisted(() => vi.fn())

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

vi.mock('@/domains/video-generation/service', () => ({
  generateFirstFrame: mockGenerateFirstFrame,
  generateVideo: mockGenerateVideo,
}))

vi.mock('@/domains/product/service', () => ({
  isSceneAllowedForProductAndIp: mockIsSceneAllowedForProductAndIp,
}))

describe('video api routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function loadProductVideosRoute(serviceMocks?: {
    getVideosByProduct?: ReturnType<typeof vi.fn>
  }) {
    vi.resetModules()
    vi.doMock('@/domains/video/service', () => ({
      getVideosByProduct: serviceMocks?.getVideosByProduct ?? vi.fn(),
    }))

    return import('@/app/api/products/[id]/videos/route')
  }

  async function loadVideosRoute(serviceMocks?: {
    getVideosByTeam?: ReturnType<typeof vi.fn>
  }) {
    vi.resetModules()
    vi.doMock('@/domains/video/service', () => ({
      getVideosByTeam: serviceMocks?.getVideosByTeam ?? vi.fn(),
    }))

    return import('@/app/api/videos/route')
  }

  async function loadVideoDetailRoute(serviceMocks?: {
    getVideoDetail?: ReturnType<typeof vi.fn>
  }) {
    vi.resetModules()
    vi.doMock('@/domains/video/service', () => ({
      getVideoDetail: serviceMocks?.getVideoDetail ?? vi.fn(),
    }))

    return import('@/app/api/videos/[videoId]/route')
  }

  async function loadGenerateVideoRoute(serviceMocks?: {
    saveUploadedVideo?: ReturnType<typeof vi.fn>
  }) {
    vi.resetModules()
    vi.doMock('@/domains/video/service', () => ({
      saveUploadedVideo: serviceMocks?.saveUploadedVideo ?? vi.fn(),
    }))

    return import('@/app/api/products/[id]/generate-video/route')
  }

  async function loadPendingCombinationsRoute(serviceMocks?: {
    getPendingVideoCombinations?: ReturnType<typeof vi.fn>
  }) {
    vi.resetModules()
    vi.doMock('@/domains/video/service', () => ({
      getPendingVideoCombinations: serviceMocks?.getPendingVideoCombinations ?? vi.fn(),
    }))

    return import('@/app/api/videos/pending-combinations/route')
  }

  async function loadPoseMovementMapRoute(serviceMocks?: {
    getPoseMovementMap?: ReturnType<typeof vi.fn>
  }) {
    vi.resetModules()
    vi.doMock('@/domains/video/service', () => ({
      getPoseMovementMap: serviceMocks?.getPoseMovementMap ?? vi.fn(),
    }))

    return import('@/app/api/videos/pose-movement-map/route')
  }

  it('returns 401 for product video list requests without a session', async () => {
    const getVideosByProduct = vi.fn()
    const { GET } = await loadProductVideosRoute({ getVideosByProduct })
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/products/product-1/videos'), {
      params: { id: 'product-1' },
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(getVideosByProduct).not.toHaveBeenCalled()
  })

  it('gets product videos for the authenticated team', async () => {
    const getVideosByProduct = vi.fn().mockResolvedValue([{ id: 'video-1' }])
    const { GET } = await loadProductVideosRoute({ getVideosByProduct })
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })

    const response = await GET(new NextRequest('http://localhost/api/products/product-1/videos'), {
      params: { id: 'product-1' },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([{ id: 'video-1' }])
    expect(getVideosByProduct).toHaveBeenCalledWith('product-1', 'team-1')
  })

  it('returns 400 for team video list requests when the session has no team', async () => {
    const getVideosByTeam = vi.fn()
    const { GET } = await loadVideosRoute({ getVideosByTeam })
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1' },
    })

    const response = await GET(new NextRequest('http://localhost/api/videos'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'No team found' })
    expect(getVideosByTeam).not.toHaveBeenCalled()
  })

  it('gets team videos for the authenticated user', async () => {
    const getVideosByTeam = vi.fn().mockResolvedValue([{ id: 'video-1' }])
    const { GET } = await loadVideosRoute({ getVideosByTeam })
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })

    const response = await GET(new NextRequest('http://localhost/api/videos'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([{ id: 'video-1' }])
    expect(getVideosByTeam).toHaveBeenCalledWith('team-1')
  })

  it('returns 404 when a video is missing or outside the team scope', async () => {
    const getVideoDetail = vi.fn().mockResolvedValue(null)
    const { GET } = await loadVideoDetailRoute({ getVideoDetail })
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })

    const response = await GET(new NextRequest('http://localhost/api/videos/video-1'), {
      params: { videoId: 'video-1' },
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Video not found' })
    expect(getVideoDetail).toHaveBeenCalledWith('video-1', 'team-1')
  })

  it('returns 401 for upload-video requests without a session', async () => {
    const saveUploadedVideo = vi.fn()
    const { POST } = await loadGenerateVideoRoute({ saveUploadedVideo })
    mockGetServerSession.mockResolvedValue(null)

    const response = await POST(new NextRequest('http://localhost/api/products/product-1/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        step: 'upload-video',
        ipId: 'ip-1',
        movementId: 'movement-1',
        videoUrl: 'https://example.com/video.mp4',
      }),
      headers: {
        'content-type': 'application/json',
      },
    }), {
      params: { id: 'product-1' },
    })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(saveUploadedVideo).not.toHaveBeenCalled()
  })

  it('returns 400 for upload-video requests when the session has no team', async () => {
    const saveUploadedVideo = vi.fn()
    const { POST } = await loadGenerateVideoRoute({ saveUploadedVideo })
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1' },
    })

    const response = await POST(new NextRequest('http://localhost/api/products/product-1/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        step: 'upload-video',
        ipId: 'ip-1',
        movementId: 'movement-1',
        videoUrl: 'https://example.com/video.mp4',
      }),
      headers: {
        'content-type': 'application/json',
      },
    }), {
      params: { id: 'product-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'No team found' })
    expect(saveUploadedVideo).not.toHaveBeenCalled()
  })

  it('returns 400 for upload-video requests with missing required fields', async () => {
    const saveUploadedVideo = vi.fn()
    const { POST } = await loadGenerateVideoRoute({ saveUploadedVideo })
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })

    const response = await POST(new NextRequest('http://localhost/api/products/product-1/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        step: 'upload-video',
        ipId: 'ip-1',
        movementId: 'movement-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    }), {
      params: { id: 'product-1' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Missing required fields: ipId, movementId, videoUrl',
    })
    expect(saveUploadedVideo).not.toHaveBeenCalled()
  })

  it('returns 404 when upload-video ownership validation fails', async () => {
    const saveUploadedVideo = vi.fn().mockRejectedValue(new Error('Product not found'))
    const { POST } = await loadGenerateVideoRoute({ saveUploadedVideo })
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })

    const response = await POST(new NextRequest('http://localhost/api/products/product-1/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        step: 'upload-video',
        ipId: 'ip-1',
        movementId: 'movement-1',
        videoUrl: 'https://example.com/video.mp4',
      }),
      headers: {
        'content-type': 'application/json',
      },
    }), {
      params: { id: 'product-1' },
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Product not found' })
  })

  it('saves an uploaded video when generate-video step is upload-video', async () => {
    const saveUploadedVideo = vi.fn().mockResolvedValue({
      videoId: 'video-1',
      videoUrl: 'https://example.com/video.mp4',
    })
    const { POST } = await loadGenerateVideoRoute({ saveUploadedVideo })
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', teamId: 'team-1' },
    })

    const response = await POST(new NextRequest('http://localhost/api/products/product-1/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        step: 'upload-video',
        ipId: 'ip-1',
        movementId: 'movement-1',
        videoUrl: 'https://example.com/video.mp4',
        prompt: 'hero shot',
        sceneId: 'scene-1',
        poseId: 'pose-1',
        firstFrameId: 'frame-1',
        styleImageId: 'style-1',
        modelImageId: 'model-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    }), {
      params: { id: 'product-1' },
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      videoId: 'video-1',
      videoUrl: 'https://example.com/video.mp4',
    })
    expect(saveUploadedVideo).toHaveBeenCalledWith({
      productId: 'product-1',
      userId: 'user-1',
      teamId: 'team-1',
      ipId: 'ip-1',
      movementId: 'movement-1',
      url: 'https://example.com/video.mp4',
      prompt: 'hero shot',
      sceneId: 'scene-1',
      poseId: 'pose-1',
      firstFrameId: 'frame-1',
      styleImageId: 'style-1',
      modelImageId: 'model-1',
    })
    expect(mockGenerateVideo).not.toHaveBeenCalled()
  })

  it('GET /api/videos/pending-combinations returns 401 without session', async () => {
    const { GET } = await loadPendingCombinationsRoute()
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost:3000/api/videos/pending-combinations'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('GET /api/videos/pending-combinations returns 400 without team', async () => {
    const getPendingVideoCombinations = vi.fn()
    const { GET } = await loadPendingCombinationsRoute({ getPendingVideoCombinations })
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })

    const response = await GET(new Request('http://localhost:3000/api/videos/pending-combinations'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'No team found' })
    expect(getPendingVideoCombinations).not.toHaveBeenCalled()
  })

  it('GET /api/videos/pending-combinations returns combinations for authenticated team', async () => {
    const getPendingVideoCombinations = vi.fn().mockResolvedValue([
      { combinationKey: 'frame-1:move-1', firstFrame: { id: 'frame-1' }, movement: { id: 'move-1' } },
    ])
    const { GET } = await loadPendingCombinationsRoute({ getPendingVideoCombinations })
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1', teamId: 'team-1' } })

    const response = await GET(new Request('http://localhost:3000/api/videos/pending-combinations'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      { combinationKey: 'frame-1:move-1', firstFrame: { id: 'frame-1' }, movement: { id: 'move-1' } },
    ])
    expect(getPendingVideoCombinations).toHaveBeenCalledWith('team-1')
  })

  it('GET /api/videos/pose-movement-map returns 401 without session', async () => {
    const { GET } = await loadPoseMovementMapRoute()
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost:3000/api/videos/pose-movement-map'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('GET /api/videos/pose-movement-map returns 400 without team', async () => {
    const getPoseMovementMap = vi.fn()
    const { GET } = await loadPoseMovementMapRoute({ getPoseMovementMap })
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } })

    const response = await GET(new Request('http://localhost:3000/api/videos/pose-movement-map'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'No team found' })
    expect(getPoseMovementMap).not.toHaveBeenCalled()
  })

  it('GET /api/videos/pose-movement-map returns mapped data for authenticated team', async () => {
    const getPoseMovementMap = vi.fn().mockResolvedValue([
      { pose: { id: 'pose-1' }, generalMovements: [], specialMovements: [], allMovements: [] },
    ])
    const { GET } = await loadPoseMovementMapRoute({ getPoseMovementMap })
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1', teamId: 'team-1' } })

    const response = await GET(new Request('http://localhost:3000/api/videos/pose-movement-map'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      { pose: { id: 'pose-1' }, generalMovements: [], specialMovements: [], allMovements: [] },
    ])
    expect(getPoseMovementMap).toHaveBeenCalledWith('team-1')
  })
})
