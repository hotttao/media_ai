export type Role = 'ADMIN' | 'MEMBER'

export interface SessionUser {
  id: string
  email: string
  nickname: string | null
  teamId: string | null
  role: Role
}

export interface InviteCodeInfo {
  code: string
  teamId: string
  teamName: string
  expiresAt: Date
}
