// domains/video/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateTaskInput, SaveUploadedVideoInput, TaskStatus } from './types'
import type { WorkflowExecutionResult } from '@/domains/workflow/types'
import { getAllowedMovementsForPose } from '@/domains/movement-material/availability'

const MANUAL_UPLOAD_SOURCE = 'manual_upload'

function parseJsonField(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

async function loadVideoTraceResources(videos: Array<{
  modelImageId?: string | null
  styleImageId?: string | null
  firstFrameId?: string | null
  sceneId?: string | null
  poseId?: string | null
  movementId?: string | null
}>) {
  const modelImageIds = [...new Set(videos.map(video => video.modelImageId).filter(Boolean))] as string[]
  const styleImageIds = [...new Set(videos.map(video => video.styleImageId).filter(Boolean))] as string[]
  const firstFrameIds = [...new Set(videos.map(video => video.firstFrameId).filter(Boolean))] as string[]
  const sceneIds = [...new Set(videos.map(video => video.sceneId).filter(Boolean))] as string[]
  const poseIds = [...new Set(videos.map(video => video.poseId).filter(Boolean))] as string[]
  const movementIds = [...new Set(videos.map(video => video.movementId).filter(Boolean))] as string[]

  const [modelImages, styleImages, firstFrames, scenes, poses, movements] = await Promise.all([
    modelImageIds.length > 0
      ? db.modelImage.findMany({
          where: { id: { in: modelImageIds } },
          select: { id: true, url: true, prompt: true, createdAt: true },
        })
      : [],
    styleImageIds.length > 0
      ? db.styleImage.findMany({
          where: { id: { in: styleImageIds } },
          select: { id: true, url: true, prompt: true, createdAt: true, modelImageId: true, poseId: true },
        })
      : [],
    firstFrameIds.length > 0
      ? db.firstFrame.findMany({
          where: { id: { in: firstFrameIds } },
          select: {
            id: true,
            url: true,
            prompt: true,
            createdAt: true,
            sceneId: true,
            composition: true,
            styleImageId: true,
          },
        })
      : [],
    sceneIds.length > 0
      ? db.material.findMany({
          where: { id: { in: sceneIds } },
          select: { id: true, name: true, url: true, prompt: true },
        })
      : [],
    poseIds.length > 0
      ? db.material.findMany({
          where: { id: { in: poseIds } },
          select: { id: true, name: true, url: true, prompt: true },
        })
      : [],
    movementIds.length > 0
      ? db.movementMaterial.findMany({
          where: { id: { in: movementIds } },
          select: { id: true, content: true, url: true, clothing: true, isGeneral: true },
        })
      : [],
  ])

  return {
    modelImages: new Map(modelImages.map(item => [item.id, item])),
    styleImages: new Map(styleImages.map(item => [item.id, item])),
    firstFrames: new Map(firstFrames.map(item => [item.id, item])),
    scenes: new Map(scenes.map(item => [item.id, item])),
    poses: new Map(poses.map(item => [item.id, item])),
    movements: new Map(movements.map(item => [item.id, item])),
  }
}

function buildVideoViewModel(
  video: any,
  traceResources: Awaited<ReturnType<typeof loadVideoTraceResources>>
) {
  return {
    ...video,
    task: video.task
      ? {
          ...video.task,
          params: parseJsonField(video.task.params),
          result: parseJsonField(video.task.result),
        }
      : null,
    trace: {
      modelImage: video.modelImageId ? traceResources.modelImages.get(video.modelImageId) ?? null : null,
      styleImage: video.styleImageId ? traceResources.styleImages.get(video.styleImageId) ?? null : null,
      firstFrame: video.firstFrameId ? traceResources.firstFrames.get(video.firstFrameId) ?? null : null,
      scene: video.sceneId ? traceResources.scenes.get(video.sceneId) ?? null : null,
      pose: video.poseId ? traceResources.poses.get(video.poseId) ?? null : null,
      movement: video.movementId ? traceResources.movements.get(video.movementId) ?? null : null,
    },
  }
}

async function validateUploadedVideoOwnership(
  tx: {
    product: { findFirst: typeof db.product.findFirst }
    virtualIp: { findFirst: typeof db.virtualIp.findFirst }
  },
  input: SaveUploadedVideoInput
) {
  const product = await tx.product.findFirst({
    where: {
      id: input.productId,
      teamId: input.teamId,
    },
    select: { id: true },
  })

  if (!product) {
    throw new Error('Product not found')
  }

  if (!input.ipId) {
    return
  }

  const ip = await tx.virtualIp.findFirst({
    where: {
      id: input.ipId,
      teamId: input.teamId,
    },
    select: { id: true },
  })

  if (!ip) {
    throw new Error('IP not found')
  }
}

export async function createVideoTask(input: CreateTaskInput) {
  return db.videoTask.create({
    data: {
      id: input.id,
      userId: input.userId,
      teamId: input.teamId,
      workflowId: input.workflowId,
      ipId: input.ipId,
      status: 'PENDING',
      params: JSON.stringify(input.params),
    },
  })
}

export async function getTasks(teamId: string, userId?: string) {
  return db.videoTask.findMany({
    where: {
      teamId,
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      workflow: true,
      ip: true,
      videos: true,
    },
  })
}

export async function getTaskById(id: string) {
  return db.videoTask.findUnique({
    where: { id },
    include: {
      workflow: true,
      ip: true,
      videos: true,
    },
  })
}

export async function updateTaskStatus(id: string, status: TaskStatus, startedAt?: Date) {
  return db.videoTask.update({
    where: { id },
    data: {
      status,
      ...(startedAt ? { startedAt } : {}),
    },
  })
}

export async function updateTaskResult(id: string, result: WorkflowExecutionResult) {
  const status = result.success ? 'COMPLETED' : 'FAILED'

  return db.videoTask.update({
    where: { id },
    data: {
      status,
      result: JSON.stringify(result),
      error: result.error,
      completedAt: new Date(),
    },
  })
}

export async function createVideo(taskId: string, userId: string, teamId: string, data: {
  name: string
  url: string
  thumbnail?: string
  duration?: number
  size?: bigint
  ipId?: string
}) {
  return db.video.create({
    data: {
      id: uuid(),
      taskId,
      userId,
      teamId,
      name: data.name,
      url: data.url,
      thumbnail: data.thumbnail,
      duration: data.duration,
      size: data.size,
      ipId: data.ipId,
    },
  })
}

export async function getVideosByProduct(productId: string, teamId: string) {
  const videos = await db.video.findMany({
    where: {
      productId,
      teamId,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      ip: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      task: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          workflow: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const traceResources = await loadVideoTraceResources(videos)

  return videos.map(video => buildVideoViewModel(video, traceResources))
}

export async function getVideosByTeam(teamId: string) {
  const videos = await db.video.findMany({
    where: { teamId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      ip: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      task: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          workflow: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const traceResources = await loadVideoTraceResources(videos)

  return videos.map(video => buildVideoViewModel(video, traceResources))
}

export async function getVideoDetail(videoId: string, teamId: string) {
  const video = await db.video.findFirst({
    where: {
      id: videoId,
      teamId,
    },
    include: {
      product: {
        include: {
          images: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      },
      ip: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          fullBodyUrl: true,
        },
      },
      task: {
        include: {
          workflow: true,
          ip: true,
        },
      },
    },
  })

  if (!video) {
    return null
  }

  const relatedVideos = video.productId
    ? await db.video.findMany({
        where: {
          teamId,
          productId: video.productId,
          NOT: {
            id: video.id,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          ip: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
            },
          },
          task: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              workflow: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      })
    : []

  const traceResources = await loadVideoTraceResources([video, ...relatedVideos])
  const detail = buildVideoViewModel(video, traceResources)

  return {
    ...detail,
    relatedVideos: relatedVideos.map(item => buildVideoViewModel(item, traceResources)),
  }
}

export async function saveUploadedVideo(input: SaveUploadedVideoInput) {
  return db.$transaction(async (tx) => {
    await validateUploadedVideoOwnership(tx, input)

    // `video_tasks.workflowId` is required, so manual uploads need a stable workflow row
    // that can be reused across uploads without adding route-level special cases.
    const workflow = await tx.workflow.upsert({
      where: { code: MANUAL_UPLOAD_SOURCE },
      update: {},
      create: {
        code: MANUAL_UPLOAD_SOURCE,
        name: 'Manual Upload',
        version: '1.0',
      },
    })

    const taskId = uuid()
    const videoId = uuid()
    const params = {
      source: MANUAL_UPLOAD_SOURCE,
      productId: input.productId,
      movementId: input.movementId,
      prompt: input.prompt,
      sceneId: input.sceneId,
      poseId: input.poseId,
      firstFrameId: input.firstFrameId,
      styleImageId: input.styleImageId,
      modelImageId: input.modelImageId,
      url: input.url,
    }
    const result = {
      success: true,
      source: MANUAL_UPLOAD_SOURCE,
      videoUrl: input.url,
      movementId: input.movementId,
      sceneId: input.sceneId,
      poseId: input.poseId,
      firstFrameId: input.firstFrameId,
      styleImageId: input.styleImageId,
      modelImageId: input.modelImageId,
    }

    await tx.videoTask.create({
      data: {
        id: taskId,
        userId: input.userId,
        teamId: input.teamId,
        workflowId: workflow.id,
        ipId: input.ipId,
        status: 'COMPLETED',
        params: JSON.stringify(params),
        result: JSON.stringify(result),
        completedAt: new Date(),
      },
    })

    await tx.video.create({
      data: {
        id: videoId,
        taskId,
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

return {
      videoId,
      videoUrl: input.url,
    }
  })
}

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
    const stripPoseIds = <T extends { poseIds?: string[] }>(m: T) => {
      const { poseIds: _poseIds, ...rest } = m
      return rest as T
    }
    return {
      pose,
      generalMovements: allMovements.filter((movement) => movement.isGeneral).map(stripPoseIds),
      specialMovements: allMovements.filter((movement) => !movement.isGeneral).map(stripPoseIds),
      allMovements: allMovements.map(stripPoseIds),
    }
  })
}
