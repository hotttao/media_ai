import type { PendingCombinationItem } from './pending-combination-types'
import { groupByMovement, groupByProduct } from './pending-combination-types'
import { PendingCombinationCard } from './PendingCombinationCard'
import { PendingCombinationGroup } from './PendingCombinationGroup'

interface PendingCombinationGridProps {
  items: PendingCombinationItem[]
  groupBy?: 'movement' | 'product' | null
}

export function PendingCombinationGrid({ items, groupBy = null }: PendingCombinationGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-sm text-white/45">
        当前没有待生成组合
      </div>
    )
  }

  if (groupBy === 'movement') {
    const groups = groupByMovement(items)
    return (
      <div>
        {groups.map((group) => (
          <PendingCombinationGroup key={group.title} group={group} />
        ))}
      </div>
    )
  }

  if (groupBy === 'product') {
    const groups = groupByProduct(items)
    return (
      <div>
        {groups.map((group) => (
          <PendingCombinationGroup key={group.title} group={group} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <PendingCombinationCard key={item.combinationKey} item={item} />
      ))}
    </div>
  )
}
