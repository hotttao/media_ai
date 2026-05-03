// domains/combination/adapters/modelImageAdapter.ts

import { Combination } from '../types'
import { db } from '@/foundation/lib/db'

export interface ModelImageApiResult {
  id: string
  ip: { id: string; nickname: string; fullBodyUrl: string | null }
  product: { id: string; name: string; mainImageUrl: string | null }
  existingModelImageId: string | null
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

  return combinations.map(combo => {
    const ip = ipMap.get(combo.elements.ipId!) || { id: '', nickname: '', fullBodyUrl: null }
    const product = productMap.get(combo.elements.productId!) || { id: '', name: '', mainImageUrl: null }

    return {
      id: combo.id,
      ip: {
        id: ip.id,
        nickname: ip.nickname,
        fullBodyUrl: ip.fullBodyUrl
      },
      product: {
        id: product.id,
        name: product.name,
        mainImageUrl: product.images?.[0]?.url || null
      },
      existingModelImageId: combo.status !== 'pending' ? combo.existingRecordId! : null
    }
  })
}