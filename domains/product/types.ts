export type TargetAudience = 'MENS' | 'WOMENS' | 'KIDS'

export interface Product {
  id: string
  userId: string
  teamId: string
  name: string
  targetAudience: TargetAudience
  productDetails: string | null
  displayActions: string | null
  tags: string[] | null
  images: ProductImage[]
  createdAt: Date
  updatedAt: Date
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  isMain: boolean
  order: number
}

export interface CreateProductInput {
  name: string
  targetAudience: TargetAudience
  productDetails?: string
  displayActions?: string
  tags?: string[]
  images?: { url: string; isMain: boolean; order: number }[]
}

export interface ProductFilterInput {
  targetAudience?: TargetAudience
  search?: string
  tags?: string[]
}