'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatDateTime, getTaskStatusLabel, type VideoDetail } from './video-types'
import { getImageUrl } from '@/foundation/lib/utils'

export function VideoPlayerPanel({ video }: { video: VideoDetail }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <section className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-6">
          <div className="mx-auto max-w-[320px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30 shadow-xl shadow-black/20">
            <video
              src={getImageUrl(video.url)}
              poster={video.thumbnail ? getImageUrl(video.thumbnail) : undefined}
              controls
              onDoubleClick={() => setIsExpanded(true)}
              className="aspect-[9/16] w-full cursor-zoom-in bg-black object-cover"
            />
          </div>
          <p className="mt-3 text-center text-xs text-white/45">
            双击视频可弹窗放大播放
          </p>
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-matcha-500/15 px-3 py-1 text-xs text-matcha-200">
                {getTaskStatusLabel(video.task?.status)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/65">
                {video.task?.workflow?.name || '未记录工作流'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {video.name || video.product?.name || '未命名视频'}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-white/60">
              {video.prompt || video.trace?.movement?.content || '暂无视频说明'}
            </p>
          </div>

          <dl className="grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm md:grid-cols-2">
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

      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <video
              src={getImageUrl(video.url)}
              poster={video.thumbnail ? getImageUrl(video.thumbnail) : undefined}
              controls
              autoPlay
              className="max-h-[85vh] w-full bg-black object-contain"
            />
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="absolute right-4 top-4 rounded-full bg-black/45 px-3 py-2 text-sm text-white/85 transition-colors hover:bg-black/65"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/5 px-3 py-3">
      <dt className="text-xs text-white/45">{label}</dt>
      <dd className="mt-1 text-sm text-white/85">{value}</dd>
    </div>
  )
}
