// components/workflow/TaskStatusBadge.tsx
'use client'

interface TaskStatusBadgeProps {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
}

const statusConfig: Record<string, { bg: string; text: string; glow: string; icon: string }> = {
  PENDING: {
    bg: 'bg-white/10',
    text: 'text-white/80',
    glow: 'shadow-white/20',
    icon: '⏳',
  },
  RUNNING: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-500/50',
    icon: '⚡',
  },
  COMPLETED: {
    bg: 'bg-matcha-500/20',
    text: 'text-matcha-300',
    glow: 'shadow-matcha-500/50',
    icon: '✓',
  },
  FAILED: {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    glow: 'shadow-red-500/50',
    icon: '✗',
  },
}

const labels: Record<string, string> = {
  PENDING: '等待中',
  RUNNING: '执行中',
  COMPLETED: '已完成',
  FAILED: '失败',
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING
  const isRunning = status === 'RUNNING'

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        backdrop-blur-sm border border-white/10
        shadow-lg ${config.glow}
        ${config.bg} ${config.text}
        ${isRunning ? 'animate-pulse' : ''}
      `}
    >
      <span className="text-sm">{config.icon}</span>
      <span className="text-xs font-medium">{labels[status]}</span>
      {isRunning && (
        <div className="flex gap-0.5 ml-1">
          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  )
}
