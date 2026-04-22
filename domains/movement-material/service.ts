// domains/movement-material/service.ts
import { db } from '@/foundation/lib/db'
import { Prisma } from '@prisma/client'
import { v4 as uuid } from 'uuid'
import type { CreateMovementMaterialInput, MovementMaterial } from './types'

const PRISMA_NOT_FOUND_ERROR_CODE = 'P2025'

export async function createMovementMaterial(input: CreateMovementMaterialInput): Promise<MovementMaterial> {
  return db.movementMaterial.create({
    data: {
      id: uuid(),
      url: input.url || null,
      content: input.content,
      clothing: input.clothing || null,
      scope: input.scope || null,
    },
  })
}

export async function getMovementMaterials(): Promise<MovementMaterial[]> {
  return db.movementMaterial.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getMovementMaterialById(id: string): Promise<MovementMaterial | null> {
  return db.movementMaterial.findUnique({
    where: { id },
  })
}

export async function updateMovementMaterial(
  id: string,
  input: Partial<CreateMovementMaterialInput>
): Promise<MovementMaterial> {
  try {
    return await db.movementMaterial.update({
      where: { id },
      data: {
        url: input.url !== undefined ? input.url || null : undefined,
        content: input.content,
        clothing: input.clothing !== undefined ? input.clothing || null : undefined,
        scope: input.scope !== undefined ? input.scope || null : undefined,
      },
    })
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
