// domains/combination/adapters/firstFrameAdapter.ts

import { Combination } from '../types'
import { db } from '@/foundation/lib/db'

export interface FirstFrameApiResult {
  id: string
  scene: { id: string; name: string; url: string | null }
  styleImage: { id: string; url: string }
  productId: string
  ipId: string
  existingFirstFrameId: string | null
}

export async function adaptFirstFrameCombinations(
  combinations: Combination[]
): Promise<FirstFrameApiResult[]> {
  // Get scene information
  const sceneIds = [...new Set(combinations.map(c => c.elements.sceneId).filter((id): id is string => Boolean(id)))]
  const scenes = await db.material.findMany({
    where: { id: { in: sceneIds }, type: 'SCENE' },
    select: { id: true, name: true, url: true }
  })

  // Get styleImage information
  const styleImageIds = [...new Set(combinations.map(c => c.elements.styleImageId).filter((id): id is string => Boolean(id)))]
  const styleImages = await db.styleImage.findMany({
    where: { id: { in: styleImageIds } },
    select: { id: true, url: true, productId: true, ipId: true }
  })

  const sceneMap = new Map(scenes.map(s => [s.id, s]))
  const styleImageMap = new Map(styleImages.map(s => [s.id, s]))

  return combinations.map(combo => {
    // Fallback to empty objects if scene/styleImage not found - this is intentional for graceful degradation
    const sceneData = sceneMap.get(combo.elements.sceneId ?? '')
    const styleImageData = styleImageMap.get(combo.elements.styleImageId ?? '')

    return {
      id: combo.id,
      scene: {
        id: sceneData?.id ?? '',
        name: sceneData?.name ?? '',
        url: sceneData?.url ?? null
      },
      styleImage: {
        id: styleImageData?.id ?? '',
        url: styleImageData?.url ?? ''
      },
      productId: styleImageData?.productId ?? '',
      ipId: styleImageData?.ipId ?? '',
      existingFirstFrameId: combo.status !== 'pending' ? (combo.existingRecordId ?? null) : null
    }
  })
}