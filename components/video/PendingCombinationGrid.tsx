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
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-white/45">
        当前没有待生成组合
      </div>
    )
  }

  if (groupBy === 'movement') {
    const groups = groupByMovement(items)
    return (
      <div className="space-y-2">
        {groups.map((group) => (
          <PendingCombinationGroup key={group.title} group={group} />
        ))}
      </div>
    )
  }

  if (groupBy === 'product') {
    const groups = groupByProduct(items)
    return (
      <div className="space-y-2">
        {groups.map((group) => (
          <PendingCombinationGroup key={group.title} group={group} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {items.map((item) => (
        <PendingCombinationCard key={item.combinationKey} item={item} />
      ))}
    </div>
  )
}
