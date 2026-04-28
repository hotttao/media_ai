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

export function getPendingCombinationTitle(item: Pick<PendingCombinationItem, 'product'>) {
  return item.product?.name || '未关联商品'
}

export interface GroupedItems {
  title: string
  count: number
  items: PendingCombinationItem[]
}

export function groupByMovement(items: PendingCombinationItem[]): GroupedItems[] {
  const groups = new Map<string, PendingCombinationItem[]>()
  for (const item of items) {
    const key = item.movement.content
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  }
  return Array.from(groups.entries())
    .map(([title, groupItems]) => ({
      title,
      count: groupItems.length,
      items: groupItems,
    }))
    .sort((a, b) => b.count - a.count)
}

export function groupByProduct(items: PendingCombinationItem[]): GroupedItems[] {
  const groups = new Map<string, PendingCombinationItem[]>()
  for (const item of items) {
    const key = item.product?.name || '未关联商品'
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  }
  return Array.from(groups.entries())
    .map(([title, groupItems]) => ({
      title,
      count: groupItems.length,
      items: groupItems,
    }))
    .sort((a, b) => b.count - a.count)
}
