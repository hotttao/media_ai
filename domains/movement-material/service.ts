// domains/movement-material/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateMovementMaterialInput, MovementMaterial } from './types'

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
  return db.movementMaterial.update({
    where: { id },
    data: {
      url: input.url !== undefined ? input.url || null : undefined,
      content: input.content,
      clothing: input.clothing !== undefined ? input.clothing || null : undefined,
      scope: input.scope !== undefined ? input.scope || null : undefined,
    },
  })
}

export async function deleteMovementMaterial(id: string): Promise<void> {
  await db.movementMaterial.delete({ where: { id } })
}
