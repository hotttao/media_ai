import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateProductMaterialInput, ProductMaterial } from './types'

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

export async function getProductMaterials(productId: string): Promise<ProductMaterial[]> {
  return db.productMaterial.findMany({
    where: { productId },
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