import type { SaveUploadedVideoInput } from './types'

const mockDb = vi.hoisted(() => ({
  video: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  modelImage: {
    findMany: vi.fn(),
  },
  styleImage: {
    findMany: vi.fn(),
  },
  firstFrame: {
    findMany: vi.fn(),
  },
  material: {
    findMany: vi.fn(),
  },
  movementMaterial: {
    findMany: vi.fn(),
  },
  product: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  virtualIp: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  workflow: {
    upsert: vi.fn(),
  },
  videoTask: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const mockUuid = vi.hoisted(() => vi.fn())

vi.mock('@/foundation/lib/db', () => ({
  db: mockDb,
}))

vi.mock('uuid', () => ({
  v4: mockUuid,
}))

import {
  getVideoDetail,
  getVideosByProduct,
  getVideosByTeam,
  saveUploadedVideo,
  getPendingVideoCombinations,
  getPoseMovementMap,
} from './service'

describe('video service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.modelImage.findMany.mockResolvedValue([])
    mockDb.styleImage.findMany.mockResolvedValue([])
    mockDb.firstFrame.findMany.mockResolvedValue([])
    mockDb.material.findMany.mockResolvedValue([])
    mockDb.movementMaterial.findMany.mockResolvedValue([])
  })

  function createTransactionMocks(overrides?: Partial<{
    product: { findFirst: ReturnType<typeof vi.fn> }
    virtualIp: { findFirst: ReturnType<typeof vi.fn> }
    workflow: { upsert: ReturnType<typeof vi.fn> }
    videoTask: { create: ReturnType<typeof vi.fn> }
    video: { create: ReturnType<typeof vi.fn> }
  }>) {
    return {
      product: {
        findFirst: vi.fn().mockResolvedValue({ id: 'product-1', teamId: 'team-1' }),
        ...overrides?.product,
      },
      virtualIp: {
        findFirst: vi.fn().mockResolvedValue({ id: 'ip-1', teamId: 'team-1' }),
        ...overrides?.virtualIp,
      },
      workflow: {
        upsert: vi.fn().mockResolvedValue({ id: 'workflow-1' }),
        ...overrides?.workflow,
      },
      videoTask: {
        create: vi.fn().mockResolvedValue({ id: 'task-1' }),
        ...overrides?.videoTask,
      },
      video: {
        create: vi.fn().mockResolvedValue({ id: 'video-1', url: 'https://example.com/video.mp4' }),
        ...overrides?.video,
      },
    }
  }

  it('gets product videos within a team ordered by newest first', async () => {
    const videos = [
      { id: 'video-2', productId: 'product-1', teamId: 'team-1' },
      { id: 'video-1', productId: 'product-1', teamId: 'team-1' },
    ]
    mockDb.video.findMany.mockResolvedValue(videos)

    const result = await getVideosByProduct('product-1', 'team-1')

    expect(result).toEqual([
      expect.objectContaining({
        id: 'video-2',
        productId: 'product-1',
        teamId: 'team-1',
        task: null,
        trace: expect.any(Object),
      }),
      expect.objectContaining({
        id: 'video-1',
        productId: 'product-1',
        teamId: 'team-1',
        task: null,
        trace: expect.any(Object),
      }),
    ])
    expect(mockDb.video.findMany).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        teamId: 'team-1',
      },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    })
  })

  it('gets team videos ordered by newest first', async () => {
    const videos = [{ id: 'video-1', teamId: 'team-1' }]
    mockDb.video.findMany.mockResolvedValue(videos)

    const result = await getVideosByTeam('team-1')

    expect(result).toEqual([
      expect.objectContaining({
        id: 'video-1',
        teamId: 'team-1',
        task: null,
        trace: expect.any(Object),
      }),
    ])
    expect(mockDb.video.findMany).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    })
  })

  it('returns null for video detail outside the team scope', async () => {
    mockDb.video.findFirst.mockResolvedValue(null)

    const result = await getVideoDetail('video-1', 'team-1')

    expect(result).toBeNull()
    expect(mockDb.video.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'video-1',
        teamId: 'team-1',
      },
      include: expect.any(Object),
    })
  })

  it('saves a manual upload as a completed task with a linked video', async () => {
    const input: SaveUploadedVideoInput = {
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
    }

    mockUuid.mockReturnValueOnce('task-1').mockReturnValueOnce('video-1')

    const tx = createTransactionMocks({
      video: {
        create: vi.fn().mockResolvedValue({ id: 'video-1', url: input.url }),
      },
    })

    mockDb.$transaction.mockImplementation(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx))

    const result = await saveUploadedVideo(input)

    expect(result).toEqual({
      videoId: 'video-1',
      videoUrl: input.url,
    })
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: input.productId,
        teamId: input.teamId,
      },
      select: { id: true },
    })
    expect(tx.virtualIp.findFirst).toHaveBeenCalledWith({
      where: {
        id: input.ipId,
        teamId: input.teamId,
      },
      select: { id: true },
    })
    expect(tx.workflow.upsert).toHaveBeenCalledWith({
      where: { code: 'manual_upload' },
      update: {},
      create: {
        code: 'manual_upload',
        name: 'Manual Upload',
        version: '1.0',
      },
    })

    const taskCreateInput = tx.videoTask.create.mock.calls[0][0].data
    expect(taskCreateInput).toMatchObject({
      id: 'task-1',
      userId: input.userId,
      teamId: input.teamId,
      workflowId: 'workflow-1',
      ipId: input.ipId,
      status: 'COMPLETED',
    })
    expect(JSON.parse(taskCreateInput.params)).toMatchObject({
      source: 'manual_upload',
      productId: input.productId,
      movementId: input.movementId,
      prompt: input.prompt,
    })
    expect(JSON.parse(taskCreateInput.result)).toMatchObject({
      success: true,
      source: 'manual_upload',
      videoUrl: input.url,
      sceneId: input.sceneId,
      poseId: input.poseId,
      firstFrameId: input.firstFrameId,
      styleImageId: input.styleImageId,
      modelImageId: input.modelImageId,
    })

    expect(tx.video.create).toHaveBeenCalledWith({
      data: {
        id: 'video-1',
        taskId: 'task-1',
        userId: input.userId,
        teamId: input.teamId,
        ipId: input.ipId,
        productId: input.productId,
        sceneId: input.sceneId,
        poseId: input.poseId,
        movementId: input.movementId,
        firstFrameId: input.firstFrameId,
        styleImageId: input.styleImageId,
        modelImageId: input.modelImageId,
        prompt: input.prompt,
        url: input.url,
      },
    })
  })

  it('reuses an existing manual_upload workflow row when saving uploads', async () => {
    const input: SaveUploadedVideoInput = {
      productId: 'product-1',
      userId: 'user-1',
      teamId: 'team-1',
      ipId: null,
      movementId: 'movement-1',
      url: 'https://example.com/video.mp4',
    }

    mockUuid.mockReturnValueOnce('task-1').mockReturnValueOnce('video-1')

    const tx = createTransactionMocks({
      virtualIp: {
        findFirst: vi.fn(),
      },
      workflow: {
        upsert: vi.fn().mockResolvedValue({ id: 'existing-workflow-1' }),
      },
    })

    mockDb.$transaction.mockImplementation(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx))

    await saveUploadedVideo(input)

    expect(tx.virtualIp.findFirst).not.toHaveBeenCalled()
    expect(tx.workflow.upsert).toHaveBeenCalledWith({
      where: { code: 'manual_upload' },
      update: {},
      create: {
        code: 'manual_upload',
        name: 'Manual Upload',
        version: '1.0',
      },
    })
    expect(tx.videoTask.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        workflowId: 'existing-workflow-1',
      }),
    }))
  })

  it('rejects uploads when the product is outside the team and skips writes', async () => {
    const input: SaveUploadedVideoInput = {
      productId: 'product-2',
      userId: 'user-1',
      teamId: 'team-1',
      ipId: 'ip-1',
      movementId: 'movement-1',
      url: 'https://example.com/video.mp4',
    }

    const tx = createTransactionMocks({
      product: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    })

    mockDb.$transaction.mockImplementation(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx))

    await expect(saveUploadedVideo(input)).rejects.toThrow('Product not found')
    expect(tx.workflow.upsert).not.toHaveBeenCalled()
    expect(tx.videoTask.create).not.toHaveBeenCalled()
    expect(tx.video.create).not.toHaveBeenCalled()
  })

  it('rejects uploads when the ip is outside the team and skips writes', async () => {
    const input: SaveUploadedVideoInput = {
      productId: 'product-1',
      userId: 'user-1',
      teamId: 'team-1',
      ipId: 'ip-2',
      movementId: 'movement-1',
      url: 'https://example.com/video.mp4',
    }

    const tx = createTransactionMocks({
      virtualIp: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    })

    mockDb.$transaction.mockImplementation(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx))

    await expect(saveUploadedVideo(input)).rejects.toThrow('IP not found')
    expect(tx.workflow.upsert).not.toHaveBeenCalled()
    expect(tx.videoTask.create).not.toHaveBeenCalled()
    expect(tx.video.create).not.toHaveBeenCalled()
  })

  describe('getPendingVideoCombinations', () => {
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
        { id: 'move-general', content: 'turn around', url: null, clothing: null, isGeneral: true, poseLinks: [] },
        { id: 'move-pose', content: 'lift skirt', url: null, clothing: null, isGeneral: false, poseLinks: [{ poseId: 'pose-1' }] },
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
      mockDb.styleImage.findMany.mockResolvedValue([])
      mockDb.movementMaterial.findMany.mockResolvedValue([])
      mockDb.video.findMany.mockResolvedValue([])
      mockDb.product.findMany.mockResolvedValue([])
      mockDb.virtualIp.findMany.mockResolvedValue([])
      mockDb.material.findMany.mockResolvedValue([])

      const result = await getPendingVideoCombinations('team-1')

      expect(result).toEqual([])
    })
  })

  describe('getPoseMovementMap', () => {
    it('returns pose movement maps split into general and special movements', async () => {
      mockDb.material.findMany.mockResolvedValue([
        { id: 'pose-1', type: 'POSE', name: 'Front Pose', url: 'https://cdn/pose-1.jpg', teamId: 'team-1' },
      ])
      mockDb.movementMaterial.findMany.mockResolvedValue([
        { id: 'move-general', content: 'turn around', url: null, clothing: null, isGeneral: true, poseLinks: [] },
        { id: 'move-special', content: 'lift skirt', url: null, clothing: null, isGeneral: false, poseLinks: [{ poseId: 'pose-1' }] },
      ])

      const result = await getPoseMovementMap('team-1')

      expect(result).toEqual([
        {
          pose: { id: 'pose-1', type: 'POSE', name: 'Front Pose', url: 'https://cdn/pose-1.jpg', teamId: 'team-1' },
          generalMovements: [{ id: 'move-general', content: 'turn around', url: null, clothing: null, isGeneral: true }],
          specialMovements: [{ id: 'move-special', content: 'lift skirt', url: null, clothing: null, isGeneral: false }],
          allMovements: [
            { id: 'move-general', content: 'turn around', url: null, clothing: null, isGeneral: true },
            { id: 'move-special', content: 'lift skirt', url: null, clothing: null, isGeneral: false },
          ],
        },
      ])
    })
  })
})
