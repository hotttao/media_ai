import { VideoCard } from './VideoCard'
import type { VideoListItem } from './video-types'

export function VideoGrid({
  videos,
  emptyTitle = '还没有视频',
  emptyDescription = '当前范围内还没有可浏览的视频记录。',
}: {
  videos: VideoListItem[]
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (videos.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
        <p className="text-lg font-medium text-white/80">{emptyTitle}</p>
        <p className="mt-2 text-sm text-white/50">{emptyDescription}</p>
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
