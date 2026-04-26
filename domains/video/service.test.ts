import type { SaveUploadedVideoInput } from './types'

const mockDb = vi.hoisted(() => ({
  video: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
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
} from './service'

describe('video service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets product videos within a team ordered by newest first', async () => {
    const videos = [
      { id: 'video-2', productId: 'product-1', teamId: 'team-1' },
      { id: 'video-1', productId: 'product-1', teamId: 'team-1' },
    ]
    mockDb.video.findMany.mockResolvedValue(videos)

    const result = await getVideosByProduct('product-1', 'team-1')

    expect(result).toEqual(videos)
    expect(mockDb.video.findMany).toHaveBeenCalledWith({
      where: {
        productId: 'product-1',
        teamId: 'team-1',
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('gets team videos ordered by newest first', async () => {
    const videos = [{ id: 'video-1', teamId: 'team-1' }]
    mockDb.video.findMany.mockResolvedValue(videos)

    const result = await getVideosByTeam('team-1')

    expect(result).toEqual(videos)
    expect(mockDb.video.findMany).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
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

    const tx = {
      workflow: {
        upsert: vi.fn().mockResolvedValue({ id: 'workflow-1' }),
      },
      videoTask: {
        create: vi.fn().mockResolvedValue({ id: 'task-1' }),
      },
      video: {
        create: vi.fn().mockResolvedValue({ id: 'video-1', url: input.url }),
      },
    }

    mockDb.$transaction.mockImplementation(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx))

    const result = await saveUploadedVideo(input)

    expect(result).toEqual({
      videoId: 'video-1',
      videoUrl: input.url,
    })
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
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
})
