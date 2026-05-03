import Link from 'next/link'
import { formatDateTime, getTaskStatusLabel, type VideoListItem } from './video-types'
import { getImageUrl } from '@/foundation/lib/utils'

export function VideoCard({
  video,
  href,
}: {
  video: VideoListItem
  href?: string
}) {
  const targetHref = href ?? `/videos/${video.id}`

  return (
    <Link
      href={targetHref}
      className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-matcha-500/50 hover:bg-white/10"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-matcha-900 via-slate-900 to-stone-900">
        {video.thumbnail ? (
          <img
            src={getImageUrl(video.thumbnail)}
            alt={video.product?.name || '视频封面'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl text-white/35">
            ▶
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white/85 backdrop-blur-sm">
              {getTaskStatusLabel(video.task?.status)}
            </span>
            <span className="text-xs text-white/70">{formatDateTime(video.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold text-white">
            {video.product?.name || '未关联商品'}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-white/60">
            {video.prompt || video.trace?.movement?.content || '暂无视频描述'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-white/55">
          <span>{video.ip?.nickname || '未关联 IP'}</span>
          <span>{video.trace?.movement?.content || '未记录动作'}</span>
        </div>
      </div>
    </Link>
  )
}
