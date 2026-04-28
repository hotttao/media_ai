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
    <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{group.title}</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
            {group.count} 个组合
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
        <div className="grid grid-cols-1 gap-3 p-4 pt-0 xl:grid-cols-2">
          {group.items.map((item) => (
            <PendingCombinationCard key={item.combinationKey} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
