export type Visibility = 'PUBLIC' | 'PERSONAL' | 'TEAM'
export type MaterialType = 'CLOTHING' | 'SCENE' | 'ACTION' | 'MAKEUP' | 'ACCESSORY' | 'OTHER'

export interface Material {
  id: string
  userId: string | null
  teamId: string | null
  visibility: Visibility
  type: MaterialType
  name: string
  description: string | null
  url: string
  tags: string[] | null
  createdAt: Date
  updatedAt: Date
}

export interface IpMaterial {
  id: string
  ipId: string
  userId: string
  type: 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'
  name: string
  description: string | null
  tags: string[] | null
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  sourceImageId: string | null
  createdAt: Date
}

export interface CreateMaterialInput {
  visibility: Visibility
  type: MaterialType
  name: string
  description?: string
  url: string
  tags?: string[]
}

export interface IpMaterialInput {
  ipId: string
  type: 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'
  name: string
  description?: string
  tags?: string[]
  fullBodyUrl?: string
  threeViewUrl?: string
  nineViewUrl?: string
  sourceImageId?: string
}