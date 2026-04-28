'use client'

import { useState } from 'react'
import type { PendingCombinationItem } from './pending-combination-types'
import { getPendingCombinationTitle } from './pending-combination-types'

export function PendingCombinationCard({ item }: { item: PendingCombinationItem }) {
  const [showNotice, setShowNotice] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex gap-4">
        <img src={item.firstFrame.url} alt={item.movement.content} className="h-28 w-20 rounded-xl object-cover" />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="line-clamp-1 text-base font-semibold text-white">{getPendingCombinationTitle(item)}</h3>
          <p className="text-sm text-white/60">IP: {item.ip?.nickname || '未记录'}</p>
          <p className="text-sm text-white/60">姿势: {item.pose?.name || item.firstFrame.poseId}</p>
          <p className="text-sm text-white/60">定妆图: {item.styleImage.id}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-white/45">{item.combinationKey}</span>
        <button
          type="button"
          onClick={() => setShowNotice(true)}
          className="rounded-xl bg-matcha-600 px-4 py-2 text-sm font-medium text-white hover:bg-matcha-500"
        >
          发起生成
        </button>
      </div>
      {showNotice && (
        <p className="mt-3 rounded-xl bg-black/20 px-3 py-2 text-xs text-white/60">
          任务发起暂未开放，当前版本仅提供待生成组合浏览。
        </p>
      )}
    </div>
  )
}
