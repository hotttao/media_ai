'use client'

import { useState } from 'react'
import type { VideoListItem } from '@/components/video/video-types'
import type { PendingCombinationItem } from '@/components/video/pending-combination-types'
import { VideoGrid } from '@/components/video/VideoGrid'
import { PendingCombinationGrid } from '@/components/video/PendingCombinationGrid'

type PendingViewMode = 'flat' | 'movement' | 'product'

export function VideosPageClient({
  videos,
  pendingCombinations,
}: {
  videos: VideoListItem[]
  pendingCombinations: PendingCombinationItem[]
}) {
  const [activeTab, setActiveTab] = useState<'generated' | 'pending'>('generated')
  const [pendingView, setPendingView] = useState<PendingViewMode>('flat')

  return (
    <div className="space-y-6">
      <div className="flex gap-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('generated')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'generated'
              ? 'border-b-2 border-matcha-500 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          已生成视频 ({videos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'border-b-2 border-matcha-500 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          未生成组合 ({pendingCombinations.length})
        </button>
      </div>

      {activeTab === 'generated' ? (
        <VideoGrid
          videos={videos}
          emptyTitle="当前还没有任何已生成视频"
          emptyDescription="先从商品详情页生成或上传视频，这里会自动汇总展示。"
          emptyActionHref="/products"
          emptyActionLabel="去商品页生成视频"
        />
      ) : (
        <div>
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setPendingView('flat')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                pendingView === 'flat'
                  ? 'bg-matcha-600 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              平铺
            </button>
            <button
              type="button"
              onClick={() => setPendingView('movement')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                pendingView === 'movement'
                  ? 'bg-matcha-600 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              按动作
            </button>
            <button
              type="button"
              onClick={() => setPendingView('product')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                pendingView === 'product'
                  ? 'bg-matcha-600 text-white'
                  : 'bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              按产品
            </button>
          </div>
          <PendingCombinationGrid
            items={pendingCombinations}
            groupBy={pendingView === 'flat' ? null : pendingView}
          />
        </div>
      )}
    </div>
  )
}
