import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateProductMaterialInput, ProductMaterial, ProductMaterialFilterInput } from './types'

export async function createProductMaterial(input: CreateProductMaterialInput): Promise<ProductMaterial> {
  return db.productMaterial.create({
    data: {
      id: uuid(),
      productId: input.productId,
      ipId: input.ipId || null,
      sceneId: input.sceneId || null,
      poseId: input.poseId || null,
      fullBodyUrl: input.fullBodyUrl || null,
      threeViewUrl: input.threeViewUrl || null,
      nineViewUrl: input.nineViewUrl || null,
      firstFrameUrl: input.firstFrameUrl || null,
    },
  })
}

export async function getProductMaterials(filters?: ProductMaterialFilterInput): Promise<ProductMaterial[]> {
  const where: any = {}
  if (filters?.productId) where.productId = filters.productId
  if (filters?.ipId) where.ipId = filters.ipId
  if (filters?.sceneId) where.sceneId = filters.sceneId
  if (filters?.poseId) where.poseId = filters.poseId
  return db.productMaterial.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProductMaterialById(id: string): Promise<ProductMaterial | null> {
  return db.productMaterial.findUnique({
    where: { id },
  })
}

export async function updateProductMaterial(
  id: string,
  input: Partial<CreateProductMaterialInput>
): Promise<ProductMaterial> {
  return db.productMaterial.update({
    where: { id },
    data: input,
  })
}

export async function deleteProductMaterial(id: string): Promise<void> {
  await db.productMaterial.delete({
    where: { id },
  })
}