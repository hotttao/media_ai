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
  const sceneIds = [...new Set(combinations.map(c => c.elements.sceneId).filter(Boolean))]
  const scenes = await db.material.findMany({
    where: { id: { in: sceneIds }, type: 'SCENE' },
    select: { id: true, name: true, url: true }
  })

  // Get styleImage information
  const styleImageIds = [...new Set(combinations.map(c => c.elements.styleImageId).filter(Boolean))]
  const styleImages = await db.styleImage.findMany({
    where: { id: { in: styleImageIds } },
    select: { id: true, url: true, productId: true, ipId: true }
  })

  const sceneMap = new Map(scenes.map(s => [s.id, s]))
  const styleImageMap = new Map(styleImages.map(s => [s.id, s]))

  return combinations.map(combo => {
    const scene = sceneMap.get(combo.elements.sceneId!) || { id: '', name: '', url: null }
    const styleImage = styleImageMap.get(combo.elements.styleImageId!) || { id: '', url: '', productId: '', ipId: '' }

    return {
      id: combo.id,
      scene: {
        id: scene.id,
        name: scene.name,
        url: scene.url
      },
      styleImage: {
        id: styleImage.id,
        url: styleImage.url
      },
      productId: styleImage.productId,
      ipId: styleImage.ipId,
      existingFirstFrameId: combo.status !== 'pending' ? combo.existingRecordId! : null
    }
  })
}