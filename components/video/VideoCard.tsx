import Link from 'next/link'
import { formatDateTime, getTaskStatusLabel, type VideoListItem } from './video-types'
import { getImageUrl } from '@/foundation/lib/utils'

const STATUS_COLORS = {
  PENDING: 'bg-amber-500/90',
  PROCESSING: 'bg-blue-500/90',
  COMPLETED: 'bg-emerald-500/90',
  FAILED: 'bg-red-500/90',
} as const

export function VideoCard({
  video,
  href,
}: {
  video: VideoListItem
  href?: string
}) {
  const targetHref = href ?? `/videos/${video.id}`
  const statusColor = STATUS_COLORS[video.task?.status ?? 'PENDING'] ?? 'bg-white/20'

  return (
    <Link
      href={targetHref}
      className="group relative block"
    >
      {/* Film strip frame */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-zinc-900 via-stone-900 to-zinc-900 p-[2px] shadow-xl shadow-black/50 transition-transform duration-500 ease-out group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-black/60">
        {/* Sprocket holes - top */}
        <div className="absolute top-0 left-0 right-0 h-2 flex justify-around items-center bg-zinc-950/80 z-10">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="w-1 h-1.5 bg-black/90 rounded-sm" />
          ))}
        </div>
        {/* Sprocket holes - bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-2 flex justify-around items-center bg-zinc-950/80 z-10">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="w-1 h-1.5 bg-black/90 rounded-sm" />
          ))}
        </div>

        {/* Main content - aspect ratio container with inner padding for sprockets */}
        <div className="relative aspect-[9/16] pt-3.5 pb-3.5">
          {/* Film overlay texture */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-stone-900/20 pointer-events-none z-5" />

          {/* Video thumbnail */}
          {video.thumbnail || video.trace?.firstFrame?.url ? (
            <div className="relative w-full h-full overflow-hidden">
              <img
                src={getImageUrl(video.thumbnail || video.trace?.firstFrame?.url)}
                alt={video.product?.name || '视频封面'}
                className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
              />
              {/* Play indicator overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <svg className="w-3.5 h-3.5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {/* Hover glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-emerald-500/20 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-stone-900">
              <div className="text-3xl text-zinc-600 mb-1">▶</div>
              <span className="text-[10px] text-zinc-500">无预览</span>
            </div>
          )}

          {/* Status badge - film rating style */}
          <div className="absolute top-4 right-1">
            <div className={`${statusColor} px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-lg backdrop-blur-sm uppercase tracking-wider`}>
              {getTaskStatusLabel(video.task?.status)}
            </div>
          </div>

          {/* Bottom info overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2 pt-5">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 drop-shadow-lg">
                {video.product?.name || '未关联商品'}
              </h3>
              <p className="text-[11px] text-zinc-300/80 line-clamp-1 leading-relaxed">
                {video.prompt || video.trace?.movement?.content || '暂无描述'}
              </p>
              <div className="flex items-center justify-between text-[10px] text-zinc-400/70">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                  {video.ip?.nickname || '未关联 IP'}
                </span>
                <span>{formatDateTime(video.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Film edge marks */}
          <div className="absolute left-0 top-3.5 bottom-3.5 w-px bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />
          <div className="absolute right-0 top-3.5 bottom-3.5 w-px bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />
        </div>
      </div>

      {/* Hover shadow glow */}
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-lg" />
    </Link>
  )
}