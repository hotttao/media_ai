export interface ProductMaterial {
  id: string
  productId: string
  ipId: string | null
  sceneId: string | null
  poseId: string | null
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  firstFrameUrl: string | null
  createdAt: Date
}

export interface CreateProductMaterialInput {
  productId: string
  ipId?: string
  sceneId?: string
  poseId?: string
  fullBodyUrl?: string
  threeViewUrl?: string
  nineViewUrl?: string
  firstFrameUrl?: string
}