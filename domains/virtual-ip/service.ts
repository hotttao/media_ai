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
      avatarUrl: input.avatarUrl,
      fullBodyUrl: input.fullBodyUrl,
      threeViewUrl: input.threeViewUrl,
      nineViewUrl: input.nineViewUrl,
      age: input.age,
      gender: input.gender,
      height: input.height,
      weight: input.weight,
      bust: input.bust,
      waist: input.waist,
      hip: input.hip,
      education: input.education,
      major: input.major,
      city: input.city,
      occupation: input.occupation,
      basicSetting: input.basicSetting,
      personality: input.personality,
      catchphrase: input.catchphrase,
      smallHabit: input.smallHabit,
      familyBackground: input.familyBackground,
      incomeLevel: input.incomeLevel,
      hobbies: input.hobbies,
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
    data: input,
  })
}

export async function deleteVirtualIp(id: string, teamId: string) {
  return db.virtualIp.deleteMany({
    where: { id, teamId },
  })
}

export async function createOrUpdateIpImage(
  ipId: string,
  data: { fullBodyUrl?: string; threeViewUrl?: string; nineViewUrl?: string }
) {
  const existing = await db.ipImage.findFirst({ where: { ipId } })

  if (existing) {
    return db.ipImage.update({
      where: { id: existing.id },
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