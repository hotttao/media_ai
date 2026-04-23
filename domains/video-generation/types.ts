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
  productMaterialId: string
}

export interface EffectImageGenerationResult {
  fullBodyUrl: string
  productMaterialId: string
}

export interface ModelImageGenerationResult {
  modelImageUrl: string
  productMaterialId: string
}

export interface StyleImageGenerationResult {
  styledImageUrl: string
  productMaterialId: string
}
