'use client'

import { useState } from 'react'
import type { GroupedItems } from './pending-combination-types'
import { PendingCombinationCard } from './PendingCombinationCard'

interface PendingCombinationGroupProps {
  group: GroupedItems
}

export function PendingCombinationGroup({ group }: PendingCombinationGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{group.title}</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
            {group.count}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="grid grid-cols-2 gap-3 px-3 pb-3 lg:grid-cols-3 xl:grid-cols-4">
          {group.items.map((item) => (
            <PendingCombinationCard key={item.combinationKey} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
