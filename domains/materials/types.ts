export type Visibility = 'PUBLIC' | 'PERSONAL' | 'TEAM'
export type MaterialType = 'SCENE' | 'POSE' | 'MAKEUP' | 'ACCESSORY' | 'OTHER'

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
  sourceIpMaterialId: string | null  // 自引用：指向 ip_materials 的另一条记录
  materialId: string | null            // 指向 materials 表
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
  sourceIpMaterialId?: string
  materialId?: string
}