import { formatDateTime, getTaskStatusLabel, type VideoTaskInfo } from './video-types'

export function VideoTaskPanel({ task }: { task: VideoTaskInfo | null | undefined }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">任务过程</h2>
        <p className="mt-1 text-sm text-white/50">用于回看这条视频当时的任务状态、参数和执行结果。</p>
      </div>

      {!task ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-sm text-white/45">
          未找到任务记录。
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm">
            <MetaRow label="任务状态" value={getTaskStatusLabel(task.status)} />
            <MetaRow label="工作流" value={task.workflow?.name || '未记录'} />
            <MetaRow label="开始时间" value={formatDateTime(task.startedAt)} />
            <MetaRow label="完成时间" value={formatDateTime(task.completedAt)} />
          </dl>

          {task.error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {task.error}
            </div>
          )}

          <JsonPanel title="任务参数" value={task.params} />
          <JsonPanel title="任务结果" value={task.result} />
        </div>
      )}
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

function JsonPanel({
  title,
  value,
}: {
  title: string
  value: Record<string, unknown> | null | undefined
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
      <div className="border-b border-white/8 px-4 py-3 text-sm font-medium text-white">{title}</div>
      <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-white/65">
        {value ? JSON.stringify(value, null, 2) : '未记录'}
      </pre>
    </div>
  )
}
