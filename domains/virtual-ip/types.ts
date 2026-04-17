export interface VirtualIp {
  id: string
  userId: string
  teamId: string
  nickname: string
  avatar: string | null
  age: number | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  height: number | null
  weight: number | null
  bust: number | null
  waist: number | null
  hip: number | null
  education: string | null
  major: string | null
  personality: string | null
  catchphrase: string | null
  classicAccessories: string | null
  classicActions: string | null
  platforms: PlatformInfo[] | null
  createdAt: Date
  updatedAt: Date
}

export interface PlatformInfo {
  platform: string
  accountId: string
}

export interface IpImage {
  id: string
  ipId: string
  avatarUrl: string | null
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  createdAt: Date
}

export interface CreateIpInput {
  nickname: string
  avatar?: string
  age?: number
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  height?: number
  weight?: number
  bust?: number
  waist?: number
  hip?: number
  education?: string
  major?: string
  personality?: string
  catchphrase?: string
  classicAccessories?: string
  classicActions?: string
  platforms?: PlatformInfo[]
}

export interface UpdateIpInput extends Partial<CreateIpInput> {}