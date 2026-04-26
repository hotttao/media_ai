// domains/video-generation/types.ts
export interface VideoGenerationInput {
  productId: string
  ipId: string
  sceneId: string
  poseId?: string
  makeupId?: string
  movementId: string
  compositionId: string // 构图场景 ID
}

export interface VideoGenerationResult {
  videoId: string
  videoUrl: string
}

export interface VideoGenerationTraceInput {
  sceneId?: string | null
  poseId?: string | null
  movementId: string
  prompt?: string | null
  firstFrameId?: string | null
  styleImageId?: string | null
  modelImageId?: string | null
}

export interface ModelImageGenerationResult {
  modelImageUrl: string
  modelImageId: string
}

export interface StyleImageGenerationResult {
  styledImageUrl: string
  styleImageId: string
}

export interface FirstFrameGenerationResult {
  firstFrameUrl: string
  firstFrameId: string
}
