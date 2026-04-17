// domains/video/service.ts
import { db } from '@/foundation/lib/db'
import type { CreateTaskInput, TaskStatus } from './types'
import type { WorkflowExecutionResult } from '@/domains/workflow/types'

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
      id: require('uuid').v4(),
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
