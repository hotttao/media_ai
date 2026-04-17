export interface Team {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface InviteCode {
  id: string
  code: string
  teamId: string
  teamName?: string
  used: boolean
  expiresAt: Date
  createdAt: Date
}
