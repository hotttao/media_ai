import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createTeam(name: string, ownerEmail: string) {
  return db.team.create({
    data: {
      id: uuid(),
      name,
    },
  })
}

export async function createInviteCode(teamId: string) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  return db.inviteCode.create({
    data: {
      id: uuid(),
      teamId,
      code: generateInviteCode(),
      expiresAt,
    },
    include: { team: true },
  })
}

export async function getTeamInviteCodes(teamId: string) {
  return db.inviteCode.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    include: { team: true },
  })
}

export async function getTeamMembers(teamId: string) {
  return db.user.findMany({
    where: { teamId },
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      createdAt: true,
    },
  })
}
