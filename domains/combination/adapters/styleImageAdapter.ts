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
  const poseIds = [...new Set(combinations.map(c => c.elements.poseId).filter(Boolean))]
  const poses = await db.material.findMany({
    where: { id: { in: poseIds }, type: 'POSE' },
    select: { id: true, name: true, url: true }
  })

  // Get modelImage information
  const modelImageIds = [...new Set(combinations.map(c => c.elements.modelImageId).filter(Boolean))]
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
    const pose = poseMap.get(combo.elements.poseId!) || { id: '', name: '', url: null }
    const modelImage = modelImageMap.get(combo.elements.modelImageId!) || { id: '', url: '', productName: '' }

    return {
      id: combo.id,
      pose: {
        id: pose.id,
        name: pose.name,
        url: pose.url
      },
      modelImage: {
        id: modelImage.id,
        url: modelImage.url,
        productName: product?.name || null
      },
      existingStyleImageId: combo.status !== 'pending' ? combo.existingRecordId! : null
    }
  })
}