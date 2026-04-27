import { VideoCard } from './VideoCard'
import type { VideoListItem } from './video-types'
import Link from 'next/link'

export function VideoGrid({
  videos,
  emptyTitle = '还没有视频',
  emptyDescription = '当前范围内还没有可浏览的视频记录。',
  emptyActionHref,
  emptyActionLabel,
  onEmptyActionClick,
}: {
  videos: VideoListItem[]
  emptyTitle?: string
  emptyDescription?: string
  emptyActionHref?: string
  emptyActionLabel?: string
  onEmptyActionClick?: () => void
}) {
  if (videos.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
        <p className="text-lg font-medium text-white/80">{emptyTitle}</p>
        <p className="mt-2 text-sm text-white/50">{emptyDescription}</p>
        {emptyActionLabel && (emptyActionHref || onEmptyActionClick) && (
          <div className="mt-6">
            {emptyActionHref ? (
              <Link
                href={emptyActionHref}
                className="inline-flex rounded-xl bg-matcha-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-matcha-500"
              >
                {emptyActionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onEmptyActionClick}
                className="inline-flex rounded-xl bg-matcha-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-matcha-500"
              >
                {emptyActionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
}
