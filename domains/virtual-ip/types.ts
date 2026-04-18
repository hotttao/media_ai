export interface VirtualIp {
  id: string
  userId: string
  teamId: string
  nickname: string
  avatarUrl: string | null
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  age: number | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  height: number | null
  weight: number | null
  bust: number | null
  waist: number | null
  hip: number | null
  education: string | null
  major: string | null
  city: string | null
  occupation: string | null
  basicSetting: string | null
  catchphrase: string | null
  smallHabit: string | null
  familyBackground: string | null
  incomeLevel: string | null
  personality: string | null
  hobbies: string | null
  createdAt: Date
  updatedAt: Date
}

export interface IpImage {
  id: string
  ipId: string
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  createdAt: Date
}

export interface CreateIpInput {
  nickname: string
  avatarUrl?: string
  fullBodyUrl?: string
  threeViewUrl?: string
  nineViewUrl?: string
  age?: number
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  height?: number
  weight?: number
  bust?: number
  waist?: number
  hip?: number
  education?: string
  major?: string
  city?: string
  occupation?: string
  basicSetting?: string
  catchphrase?: string
  smallHabit?: string
  familyBackground?: string
  incomeLevel?: string
  personality?: string
  hobbies?: string
}

export interface UpdateIpInput extends Partial<CreateIpInput> {}