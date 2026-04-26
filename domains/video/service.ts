// domains/video/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateTaskInput, SaveUploadedVideoInput, TaskStatus } from './types'
import type { WorkflowExecutionResult } from '@/domains/workflow/types'

const MANUAL_UPLOAD_SOURCE = 'manual_upload'

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
  return db.video.findMany({
    where: {
      productId,
      teamId,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getVideosByTeam(teamId: string) {
  return db.video.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getVideoDetail(videoId: string, teamId: string) {
  return db.video.findFirst({
    where: {
      id: videoId,
      teamId,
    },
    include: {
      product: true,
      ip: true,
      task: {
        include: {
          workflow: true,
          ip: true,
        },
      },
    },
  })
}

export async function saveUploadedVideo(input: SaveUploadedVideoInput) {
  return db.$transaction(async (tx) => {
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
