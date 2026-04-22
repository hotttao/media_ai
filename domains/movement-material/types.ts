// domains/movement-material/types.ts
export interface MovementMaterial {
  id: string
  url: string | null
  content: string
  clothing: string | null
  scope: string | null
  createdAt: Date
}

export interface CreateMovementMaterialInput {
  url?: string
  content: string
  clothing?: string
  scope?: string
}
