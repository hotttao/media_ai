import { formatDateTime, type VideoDetail, type VideoTraceResource } from './video-types'

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
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">生成过程</h2>
        <p className="mt-1 text-sm text-white/50">按实际链路回看本条视频使用的素材与动作。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TRACE_STEPS.map((step) => (
          <TraceCard
            key={step.key}
            label={step.label}
            emptyText={step.empty}
            resource={video.trace?.[step.key] ?? null}
          />
        ))}
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
    <div className="overflow-hidden rounded-3xl border border-white/8 bg-black/20">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h3 className="text-sm font-medium text-white">{label}</h3>
        <span className="text-xs text-white/45">
          {resource?.createdAt ? formatDateTime(resource.createdAt) : '未记录'}
        </span>
      </div>

      {resource ? (
        <div className="space-y-3 p-4">
          {resource.url ? (
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white/5">
              <img src={resource.url} alt={label} className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-white/5 text-3xl text-white/25">
              {label === '动作' ? '↗' : '•'}
            </div>
          )}
          <div className="space-y-1.5 text-sm">
            <p className="text-white/80">{resource.name || resource.content || emptyText}</p>
            {resource.prompt && <p className="line-clamp-3 text-white/50">{resource.prompt}</p>}
            {resource.composition && <p className="line-clamp-2 text-white/50">{resource.composition}</p>}
            {resource.clothing && <p className="line-clamp-2 text-white/50">适用服装：{resource.clothing}</p>}
          </div>
        </div>
      ) : (
        <div className="p-4 text-sm text-white/45">{emptyText}</div>
      )}
    </div>
  )
}
