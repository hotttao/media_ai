// domains/combination/types.ts

// ============ 枚举 ============

export enum CombinationType {
  MODEL_IMAGE = 'MODEL_IMAGE',
  STYLE_IMAGE = 'STYLE_IMAGE',
  FIRST_FRAME = 'FIRST_FRAME',
  VIDEO = 'VIDEO'
}

export enum GenerationPath {
  GPT = 'gpt',
  JIMENG = 'jimeng'
}

export enum ConstraintType {
  POSE = 'POSE',
  MOVEMENT = 'MOVEMENT',
  SCENE = 'SCENE',
  MATERIAL = 'MATERIAL',
  STYLE = 'STYLE',
  CUSTOM = 'CUSTOM'
}

export enum ConstraintSubjectType {
  PRODUCT = 'PRODUCT',
  IP = 'IP'
}

// ============ 约束相关 ============

export interface Constraint {
  id: string
  type: ConstraintType
  subjectType: ConstraintSubjectType
  subjectId: string
  allowedValues: string[]
  priority: number
  description?: string
}

// ============ 素材相关 ============

export interface Pose {
  id: string
  ipId: string
  name: string
  url?: string
  prompt?: string
}

export interface Movement {
  id: string
  ipId: string
  name: string
  url?: string
  content: string
  isGeneral: boolean
  poseIds: string[]
  prompt?: string
}

export interface Scene {
  id: string
  name: string
  url: string
}

export interface StyleImage {
  id: string
  productId: string
  ipId: string
  url: string
  prompt?: string
  poseId: string
  makeupId: string
  accessoryId: string
}

export interface ModelImage {
  id: string
  productId: string
  ipId: string
  url: string
  prompt?: string
}

export interface MaterialPool {
  poses: Pose[]
  movements: Movement[]
  scenes: Scene[]
  styleImages: StyleImage[]
  modelImages: ModelImage[]
}

// ============ 组合结果 ============

export interface CombinationElement {
  poseId?: string
  movementId?: string
  sceneId?: string
  styleImageId?: string
  modelImageId?: string
  makeupId?: string
  accessoryId?: string
  productId?: string
  ipId?: string
  generationPath?: GenerationPath
}

export type CombinationStatus = 'pending' | 'generated' | 'qualified' | 'published'

export interface Combination {
  id: string
  type: CombinationType
  elements: CombinationElement
  status: CombinationStatus
  existingRecordId?: string
}

export interface CombinationStats {
  total: number
  generated: number
  qualified: number
  published: number
  pending: number
  newGeneratable: number
}

export interface CombinationResult {
  combinations: Combination[]
  stats: CombinationStats
  appliedConstraints: Constraint[]
}

// ============ 配置 ============

export interface CombinationConfig {
  type: CombinationType
  includeQualified?: boolean
  includePublished?: boolean
  extraConstraints?: Constraint[]
  generationPath?: GenerationPath  // 仅 FIRST_FRAME 类型使用，指定生成平台
}

// ============ 接口定义（供外部使用）============

export interface ICombinationEngine {
  compute(productId: string, ipId: string, config: CombinationConfig): Promise<CombinationResult>
}