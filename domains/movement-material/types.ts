// domains/movement-material/types.ts
export interface MovementMaterial {
  id: string
  url: string | null
  content: string
  clothing: string | null
  scope: string | null
  isGeneral: boolean
  poseIds: string[]
  createdAt: Date
}

export interface CreateMovementMaterialInput {
  url?: string
  content?: string
  clothing?: string
  scope?: string
  isGeneral?: boolean
  poseIds?: string[]
}
