export interface PendingCombinationItem {
  combinationKey: string
  firstFrame: {
    id: string
    url: string
    productId: string
    ipId: string
    styleImageId: string | null
    poseId: string
    sceneId?: string | null
    createdAt: string | Date
    [key: string]: unknown
  }
  styleImage: {
    id: string
    url: string
  }
  movement: {
    id: string
    content: string
    url?: string | null
    clothing?: string | null
    isGeneral: boolean
  }
  product?: { id: string; name: string } | null
  ip?: { id: string; nickname: string } | null
  pose?: { id: string; name: string; url: string } | null
  scene?: { id: string; name: string; url: string } | null
}

export function getPendingCombinationTitle(item: Pick<PendingCombinationItem, 'product' | 'movement'>) {
  return `${item.product?.name || '未关联商品'} · ${item.movement.content}`
}
