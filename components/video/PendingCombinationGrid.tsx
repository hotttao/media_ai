import type { PendingCombinationItem } from './pending-combination-types'
import { PendingCombinationCard } from './PendingCombinationCard'

export function PendingCombinationGrid({ items }: { items: PendingCombinationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center text-sm text-white/45">
        当前没有待生成组合
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
