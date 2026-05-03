// domains/combination/adapters/styleImageAdapter.ts

import { Combination } from '../types'
import { db } from '@/foundation/lib/db'

export interface StyleImageApiResult {
  id: string
  pose: { id: string; name: string; url: string | null }
  modelImage: { id: string; url: string; productName: string | null }
  existingStyleImageId: string | null
}

export async function adaptStyleImageCombinations(
  combinations: Combination[],
  productId: string
): Promise<StyleImageApiResult[]> {
  // Get pose information
  const poseIds = [...new Set(combinations.map(c => c.elements.poseId).filter((id): id is string => Boolean(id)))]
  const poses = await db.material.findMany({
    where: { id: { in: poseIds }, type: 'POSE' },
    select: { id: true, name: true, url: true }
  })

  // Get modelImage information
  const modelImageIds = [...new Set(combinations.map(c => c.elements.modelImageId).filter((id): id is string => Boolean(id)))]
  const modelImages = await db.modelImage.findMany({
    where: { id: { in: modelImageIds } },
    select: { id: true, url: true, productId: true }
  })

  // Get product name
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { name: true }
  })

  const poseMap = new Map(poses.map(p => [p.id, p]))
  const modelImageMap = new Map(modelImages.map(m => [m.id, m]))

  return combinations.map(combo => {
    // Fallback to empty objects if pose/modelImage not found - this is intentional for graceful degradation
    const poseData = poseMap.get(combo.elements.poseId ?? '')
    const modelImageData = modelImageMap.get(combo.elements.modelImageId ?? '')

    return {
      id: combo.id,
      pose: {
        id: poseData?.id ?? '',
        name: poseData?.name ?? '',
        url: poseData?.url ?? null
      },
      modelImage: {
        id: modelImageData?.id ?? '',
        url: modelImageData?.url ?? '',
        productName: product?.name || null
      },
      existingStyleImageId: combo.status !== 'pending' ? (combo.existingRecordId ?? null) : null
    }
  })
}