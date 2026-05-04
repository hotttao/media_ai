// domains/combination/adapters/modelImageAdapter.ts

import { Combination } from '../types'
import { db } from '@/foundation/lib/db'

export interface ModelImageApiResult {
  id: string
  ip: { id: string; nickname: string; fullBodyUrl: string | null }
  product: { id: string; name: string; mainImageUrl: string | null }
  existingModelImageId: string | null
  resultUrl: string | null
}

export async function adaptModelImageCombinations(
  combinations: Combination[],
  teamId: string
): Promise<ModelImageApiResult[]> {
  // Get all IPs for the team
  const ips = await db.virtualIp.findMany({
    where: { teamId },
    select: { id: true, nickname: true, fullBodyUrl: true }
  })

  // Get all products for the team
  const products = await db.product.findMany({
    where: { teamId },
    select: { id: true, name: true, images: { where: { isMain: true }, take: 1 } }
  })

  // Build ipId -> ip info map
  const ipMap = new Map(ips.map(ip => [ip.id, ip]))
  // Build productId -> product info map
  const productMap = new Map(products.map(p => [p.id, p]))

  // Get all existing modelImages for result URLs
  const modelImageIds = [...new Set(combinations.map(c => c.elements.modelImageId).filter((id): id is string => Boolean(id)))]
  const existingModelImages = await db.modelImage.findMany({
    where: { id: { in: modelImageIds } },
    select: { id: true, url: true }
  })
  const modelImageUrlMap = new Map(existingModelImages.map(m => [m.id, m.url]))

  return combinations.map(combo => {
    // Fallback to empty objects if IP/product not found - this is intentional for graceful degradation
    const ipData = ipMap.get(combo.elements.ipId ?? '')
    const productData = productMap.get(combo.elements.productId ?? '')

    // Get result URL from existing modelImage if generated
    const resultUrl = combo.existingRecordId ? modelImageUrlMap.get(combo.existingRecordId) ?? null : null

    return {
      id: combo.id,
      ip: {
        id: ipData?.id ?? '',
        nickname: ipData?.nickname ?? '',
        fullBodyUrl: ipData?.fullBodyUrl ?? null
      },
      product: {
        id: productData?.id ?? '',
        name: productData?.name ?? '',
        mainImageUrl: productData?.images?.[0]?.url ?? null
      },
      existingModelImageId: combo.status !== 'pending' ? (combo.existingRecordId ?? null) : null,
      resultUrl
    }
  })
}