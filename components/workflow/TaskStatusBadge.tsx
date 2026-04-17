// components/workflow/TaskStatusBadge.tsx
import { Badge } from '@/components/ui/badge'

interface TaskStatusBadgeProps {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'secondary'> = {
    PENDING: 'secondary',
    RUNNING: 'secondary',
    COMPLETED: 'success',
    FAILED: 'destructive',
  }

  const labels: Record<string, string> = {
    PENDING: '等待中',
    RUNNING: '执行中',
    COMPLETED: '已完成',
    FAILED: '失败',
  }

  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
