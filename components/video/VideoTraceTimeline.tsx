import { formatDateTime, type VideoDetail, type VideoTraceResource } from './video-types'
import { getImageUrl } from '@/foundation/lib/utils'

const TRACE_STEPS: Array<{
  key: keyof NonNullable<VideoDetail['trace']>
  label: string
  empty: string
}> = [
  { key: 'modelImage', label: '模特图', empty: '未记录模特图' },
  { key: 'styleImage', label: '定妆图', empty: '未记录定妆图' },
  { key: 'firstFrame', label: '首帧图', empty: '未记录首帧图' },
  { key: 'scene', label: '场景', empty: '未记录场景' },
  { key: 'pose', label: '姿势', empty: '未记录姿势' },
  { key: 'movement', label: '动作', empty: '未记录动作' },
]

export function VideoTraceTimeline({ video }: { video: VideoDetail }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">生成过程</h2>
        <p className="mt-1 text-sm text-white/50">所有素材压缩在一行展示，方便快速横向比对。</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-3">
          {TRACE_STEPS.map((step, index) => (
            <div key={step.key} className="flex items-center gap-3">
              <TraceCard
                label={step.label}
                emptyText={step.empty}
                resource={video.trace?.[step.key] ?? null}
              />
              {index < TRACE_STEPS.length - 1 && (
                <div className="text-xl text-white/25">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TraceCard({
  label,
  emptyText,
  resource,
}: {
  label: string
  emptyText: string
  resource: VideoTraceResource | null
}) {
  return (
    <div className="w-[172px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-black/20">
      <div className="border-b border-white/8 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-white">{label}</h3>
          <span className="text-[10px] text-white/40">
            {resource?.createdAt ? formatDateTime(resource.createdAt) : '未记录'}
          </span>
        </div>
      </div>

      {resource ? (
        <div className="space-y-2 p-3">
          {resource.url ? (
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white/5">
              <img src={getImageUrl(resource.url)} alt={label} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-white/5 text-2xl text-white/25">
              {label === '动作' ? '↗' : '•'}
            </div>
          )}

          <div className="space-y-1 text-xs">
            <p className="line-clamp-1 text-white/80">{resource.name || resource.content || emptyText}</p>
            {resource.prompt && <p className="line-clamp-2 text-white/45">{resource.prompt}</p>}
            {resource.composition && <p className="line-clamp-2 text-white/45">{resource.composition}</p>}
            {resource.clothing && <p className="line-clamp-1 text-white/45">服装: {resource.clothing}</p>}
          </div>
        </div>
      ) : (
        <div className="p-3 text-xs text-white/45">{emptyText}</div>
      )}
    </div>
  )
}
