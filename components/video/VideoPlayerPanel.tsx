import Link from 'next/link'
import { formatDateTime, getTaskStatusLabel, type VideoDetail } from './video-types'

export function VideoPlayerPanel({ video }: { video: VideoDetail }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 shadow-2xl shadow-black/20">
        <video
          src={video.url}
          poster={video.thumbnail || undefined}
          controls
          className="aspect-video w-full bg-black"
        />
      </div>

      <div className="space-y-5 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-matcha-500/15 px-3 py-1 text-xs text-matcha-200">
              {getTaskStatusLabel(video.task?.status)}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/65">
              {video.task?.workflow?.name || '未记录工作流'}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {video.name || video.product?.name || '未命名视频'}
          </h1>
          <p className="text-sm leading-6 text-white/60">
            {video.prompt || video.trace?.movement?.content || '暂无视频说明'}
          </p>
        </div>

        <dl className="grid gap-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm">
          <MetaRow label="所属商品" value={video.product?.name || '未关联'} />
          <MetaRow label="关联 IP" value={video.ip?.nickname || '未关联'} />
          <MetaRow label="动作" value={video.trace?.movement?.content || '未记录'} />
          <MetaRow label="生成时间" value={formatDateTime(video.createdAt)} />
        </dl>

        <div className="flex flex-wrap gap-3">
          {video.product?.id && (
            <Link
              href={`/products/${video.product.id}`}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/15"
            >
              返回商品详情
            </Link>
          )}
          {video.product?.id && (
            <Link
              href={`/products/${video.product.id}#videos`}
              className="rounded-xl bg-matcha-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-matcha-500"
            >
              查看该商品全部视频
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-white/45">{label}</dt>
      <dd className="text-right text-white/85">{value}</dd>
    </div>
  )
}
