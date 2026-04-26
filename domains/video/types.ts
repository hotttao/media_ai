// domains/video/types.ts
import type { WorkflowExecutionResult } from '@/domains/workflow/types'

export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface VideoTask {
  id: string
  userId: string
  teamId: string
  workflowId: string
  ipId: string | null
  status: TaskStatus
  params: Record<string, any>
  result?: WorkflowExecutionResult
  error?: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

export interface CreateTaskInput {
  id: string
  userId: string
  teamId: string
  workflowId: string
  ipId: string | null
  params: Record<string, any>
}

export interface SaveUploadedVideoInput {
  productId: string
  userId: string
  teamId: string
  ipId: string | null
  movementId: string
  url: string
  prompt?: string
  sceneId?: string
  poseId?: string
  firstFrameId?: string
  styleImageId?: string
  modelImageId?: string
}
