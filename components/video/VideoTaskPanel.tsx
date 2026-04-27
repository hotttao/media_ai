import { formatDateTime, getTaskStatusLabel, type VideoTaskInfo } from './video-types'

export function VideoTaskPanel({ task }: { task: VideoTaskInfo | null | undefined }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">任务信息</h2>
        <p className="mt-1 text-sm text-white/50">任务过程、任务参数、任务结果并排展示，避免整页向下拉太长。</p>
      </div>

      {!task ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-sm text-white/45">
          未找到任务记录。
        </div>
      ) : (
        <div className="space-y-4">
          {task.error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
              {task.error}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <h3 className="mb-3 text-sm font-medium text-white">任务过程</h3>
              <dl className="space-y-3 text-sm">
                <MetaRow label="任务状态" value={getTaskStatusLabel(task.status)} />
                <MetaRow label="工作流" value={task.workflow?.name || '未记录'} />
                <MetaRow label="创建时间" value={formatDateTime(task.createdAt)} />
                <MetaRow label="开始时间" value={formatDateTime(task.startedAt)} />
                <MetaRow label="完成时间" value={formatDateTime(task.completedAt)} />
              </dl>
            </div>

            <JsonPanel title="任务参数" value={task.params} />
            <JsonPanel title="任务结果" value={task.result} />
          </div>
        </div>
      )}
    </section>
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

function JsonPanel({
  title,
  value,
}: {
  title: string
  value: unknown
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
      <div className="border-b border-white/8 px-4 py-3 text-sm font-medium text-white">{title}</div>
      <pre className="max-h-[320px] overflow-auto px-4 py-4 text-xs leading-6 text-white/65">
        {renderPanelValue(value)}
      </pre>
    </div>
  )
}

function renderPanelValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '未记录'
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
