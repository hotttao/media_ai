// app/(app)/tasks/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getTasks } from '@/domains/video/service'
import { TaskStatusBadge } from '@/components/workflow/TaskStatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default async function TasksPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    return (
      <div className="space-y-4">
        <p>请先加入一个团队</p>
      </div>
    )
  }

  const tasks = await getTasks(session.user.teamId)

  return (
    <div className="space-y-6">
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-warm-silver">暂无任务</p>
          <Link href="/workflows" className="text-matcha-600 hover:underline mt-2 inline-block">
            去选择一个工作流
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{task.workflow?.name || 'Unknown workflow'}</p>
                    <p className="text-sm text-warm-silver">
                      {task.ip?.nickname ? `IP: ${task.ip.nickname}` : ''}
                      {' '}
                      创建于 {new Date(task.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>
                {task.error && (
                  <p className="text-sm text-red-500 mt-2">错误: {task.error}</p>
                )}
                {task.result && (() => {
                  const result = typeof task.result === 'string' ? JSON.parse(task.result) : task.result
                  return result?.videoUrl && (
                    <div className="mt-3">
                      <a
                        href={result.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-matcha-600 hover:underline text-sm"
                      >
                        查看生成的视频 →
                      </a>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
