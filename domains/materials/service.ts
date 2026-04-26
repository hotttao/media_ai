import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateMaterialInput, IpMaterialInput, UpdateMaterialInput } from './types'
import { Visibility, MaterialType } from '@prisma/client'

export async function createMaterial(
  userId: string,
  teamId: string | null,
  input: CreateMaterialInput
) {
  return db.material.create({
    data: {
      id: uuid(),
      userId: input.visibility === 'PERSONAL' ? userId : null,
      teamId: input.visibility === 'TEAM' ? teamId : null,
      visibility: input.visibility,
      type: input.type,
      name: input.name,
      description: input.description,
      prompt: input.prompt,
      url: input.url,
      tags: input.tags ? JSON.stringify(input.tags) : null,
    },
  })
}

export async function getMaterials(
  teamId: string,
  userId: string,
  filters?: { type?: MaterialType; visibility?: Visibility; search?: string }
) {
  const where: any = {
    OR: [
      { visibility: 'PUBLIC' },
      { visibility: 'TEAM', teamId },
      { visibility: 'PERSONAL', userId },
    ],
  }

  if (filters?.type) {
    where.type = filters.type
  }

  if (filters?.search) {
    where.name = { contains: filters.search }
  }

  return db.material.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getMaterialById(id: string) {
  return db.material.findUnique({ where: { id } })
}

export async function deleteMaterial(id: string, userId: string, teamId: string) {
  return db.material.deleteMany({
    where: {
      id,
      OR: [
        { userId },
        { visibility: 'TEAM', teamId },
        { visibility: 'PUBLIC' },
      ],
    },
  })
}

export async function updateMaterial(id: string, userId: string, teamId: string, input: UpdateMaterialInput) {
  const existing = await db.material.findFirst({
    where: {
      id,
      OR: [
        { userId },
        { visibility: 'TEAM', teamId },
        { visibility: 'PUBLIC' },
      ],
    },
  })

  if (!existing) {
    return null
  }

  return db.material.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      visibility: input.visibility,
      description: input.description,
      prompt: input.prompt,
      url: input.url,
      tags: input.tags ? JSON.stringify(input.tags) : input.tags === undefined ? undefined : null,
      userId: input.visibility === 'PERSONAL' ? userId : null,
      teamId: input.visibility === 'TEAM' ? teamId : null,
    },
  })
}

export async function getIpMaterials(ipId: string, type?: 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING') {
  return db.ipMaterial.findMany({
    where: {
      ipId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sourceIpMaterial: true,
      material: true,
    },
  })
}

export async function createIpMaterial(userId: string, input: IpMaterialInput) {
  return db.ipMaterial.create({
    data: {
      id: uuid(),
      ipId: input.ipId,
      userId,
      type: input.type,
      name: input.name,
      description: input.description,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      fullBodyUrl: input.fullBodyUrl,
      threeViewUrl: input.threeViewUrl,
      nineViewUrl: input.nineViewUrl,
      sourceIpMaterialId: input.sourceIpMaterialId,
      materialId: input.materialId,
    },
  })
}
