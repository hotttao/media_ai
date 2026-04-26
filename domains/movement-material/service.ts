// domains/movement-material/service.ts
import { db } from '@/foundation/lib/db'
import { Prisma } from '@prisma/client'
import { v4 as uuid } from 'uuid'
import type { CreateMovementMaterialInput, MovementMaterial } from './types'
import type { UpdateMovementMaterialInput } from './validators'

const PRISMA_NOT_FOUND_ERROR_CODE = 'P2025'

type MovementMaterialRecord = {
  id: string
  url: string | null
  content: string
  clothing: string | null
  scope: string | null
  isGeneral: boolean
  createdAt: Date
  poseLinks?: { poseId: string }[]
}

function mapMovementMaterial(movement: MovementMaterialRecord): MovementMaterial {
  return {
    id: movement.id,
    url: movement.url,
    content: movement.content,
    clothing: movement.clothing,
    scope: movement.scope,
    isGeneral: movement.isGeneral,
    poseIds: movement.poseLinks?.map((link) => link.poseId) ?? [],
    createdAt: movement.createdAt,
  }
}

export async function createMovementMaterial(input: CreateMovementMaterialInput): Promise<MovementMaterial> {
  const movement = await db.movementMaterial.create({
    data: {
      id: uuid(),
      url: input.url || null,
      content: input.content || '',
      clothing: input.clothing || null,
      scope: input.scope || null,
      isGeneral: input.isGeneral ?? true,
      poseLinks: input.poseIds?.length
        ? {
            create: input.poseIds.map((poseId) => ({
              id: uuid(),
              poseId,
            })),
          }
        : undefined,
    },
    include: {
      poseLinks: true,
    },
  })

  return mapMovementMaterial(movement)
}

export async function getMovementMaterials(): Promise<MovementMaterial[]> {
  const movements = await db.movementMaterial.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      poseLinks: true,
    },
  })

  return movements.map(mapMovementMaterial)
}

export async function getMovementMaterialById(id: string): Promise<MovementMaterial | null> {
  const movement = await db.movementMaterial.findUnique({
    where: { id },
    include: {
      poseLinks: true,
    },
  })

  return movement ? mapMovementMaterial(movement) : null
}

export async function updateMovementMaterial(
  id: string,
  input: UpdateMovementMaterialInput
): Promise<MovementMaterial> {
  try {
    const movement = await db.movementMaterial.update({
      where: { id },
      data: {
        url: input.url !== undefined ? input.url || null : undefined,
        content: input.content !== undefined ? input.content : undefined,
        clothing: input.clothing !== undefined ? input.clothing || null : undefined,
        scope: input.scope !== undefined ? input.scope || null : undefined,
        isGeneral: input.isGeneral,
        poseLinks: input.poseIds
          ? {
              deleteMany: {},
              create: input.poseIds.map((poseId) => ({
                id: uuid(),
                poseId,
              })),
            }
          : undefined,
      },
      include: {
        poseLinks: true,
      },
    })

    return mapMovementMaterial(movement)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_NOT_FOUND_ERROR_CODE) {
      throw new Error('Not found')
    }
    throw error
  }
}

export async function deleteMovementMaterial(id: string): Promise<void> {
  try {
    await db.movementMaterial.delete({ where: { id } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_NOT_FOUND_ERROR_CODE) {
      throw new Error('Not found')
    }
    throw error
  }
}
