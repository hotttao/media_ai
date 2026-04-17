import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateIpInput, UpdateIpInput } from './types'

export async function createVirtualIp(userId: string, teamId: string, input: CreateIpInput) {
  return db.virtualIp.create({
    data: {
      id: uuid(),
      userId,
      teamId,
      nickname: input.nickname,
      avatar: input.avatar,
      age: input.age,
      gender: input.gender,
      height: input.height,
      weight: input.weight,
      bust: input.bust,
      waist: input.waist,
      hip: input.hip,
      education: input.education,
      major: input.major,
      personality: input.personality,
      catchphrase: input.catchphrase,
      classicAccessories: input.classicAccessories,
      classicActions: input.classicActions,
      platforms: input.platforms ? JSON.stringify(input.platforms) : null,
    },
  })
}

export async function getVirtualIps(teamId: string) {
  return db.virtualIp.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    include: {
      images: true,
    },
  })
}

export async function getVirtualIpById(id: string, teamId: string) {
  return db.virtualIp.findFirst({
    where: { id, teamId },
    include: {
      images: true,
      ipMaterials: true,
    },
  })
}

export async function updateVirtualIp(id: string, teamId: string, input: UpdateIpInput) {
  return db.virtualIp.updateMany({
    where: { id, teamId },
    data: {
      ...input,
      platforms: input.platforms ? JSON.stringify(input.platforms) : undefined,
    },
  })
}

export async function deleteVirtualIp(id: string, teamId: string) {
  return db.virtualIp.deleteMany({
    where: { id, teamId },
  })
}

export async function createOrUpdateIpImage(
  ipId: string,
  data: { avatarUrl?: string; fullBodyUrl?: string; threeViewUrl?: string; nineViewUrl?: string }
) {
  const existing = await db.ipImage.findUnique({ where: { ipId } })

  if (existing) {
    return db.ipImage.update({
      where: { ipId },
      data,
    })
  }

  return db.ipImage.create({
    data: {
      id: uuid(),
      ipId,
      ...data,
    },
  })
}