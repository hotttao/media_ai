'use client'

import { useState } from 'react'
import type { PendingCombinationItem } from './pending-combination-types'
import { getPendingCombinationTitle } from './pending-combination-types'

export function PendingCombinationCard({ item }: { item: PendingCombinationItem }) {
  const [showNotice, setShowNotice] = useState(false)

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex gap-2 p-2">
        <img src={item.firstFrame.url} alt={item.movement.content} className="h-14 w-12 rounded-lg object-cover shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-xs font-semibold text-white">{getPendingCombinationTitle(item)}</h3>
          <p className="mt-0.5 text-xs text-white/60">IP: {item.ip?.nickname || '未记录'}</p>
          <p className="text-xs text-white/60">姿势: {item.pose?.name || item.firstFrame.poseId}</p>
        </div>
      </div>
      <div className="border-t border-white/5 px-2 py-1">
        <p className="line-clamp-2 text-xs leading-relaxed text-white/45">动作: {item.movement.content}</p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-white/5 px-2 py-1">
        <span className="truncate text-xs text-white/30">{item.combinationKey}</span>
        <button
          type="button"
          onClick={() => setShowNotice(true)}
          className="shrink-0 rounded-lg bg-matcha-600 px-2 py-1 text-xs font-medium text-white hover:bg-matcha-500"
        >
          发起
        </button>
      </div>
      {showNotice && (
        <p className="mx-2 mb-2 rounded-lg bg-black/20 px-2 py-1 text-xs text-white/60">
          任务发起暂未开放，当前版本仅提供待生成组合浏览。
        </p>
      )}
    </div>
  )
}
