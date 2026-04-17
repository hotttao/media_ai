// app/(app)/tasks/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Task {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  workflow?: { name: string }
  ip?: { nickname: string }
  createdAt: string
  error?: string
  result?: any
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        setTasks(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-matcha-500 border-t-transparent animate-spin" />
          <p className="text-white/60">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-2xl" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <div className="text-6xl mb-4">📋</div>
          <p className="text-white/60 mb-4">暂无任务</p>
          <Link
            href="/workflows"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-matcha-600 to-matcha-500 text-white font-medium shadow-lg shadow-matcha-500/30 hover:shadow-xl hover:scale-105 transition-all"
          >
            去选择一个工作流
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="relative overflow-hidden rounded-2xl p-5 backdrop-blur-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Glow for running tasks */}
              {task.status === 'RUNNING' && (
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-matcha-500/20 blur-xl animate-pulse" />
              )}

              <div className="relative z-10 flex items-center justify-between">
                {/* Left: Task info */}
                <div className="flex items-center gap-4">
                  {/* Status icon */}
                  <div
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center text-xl
                      ${task.status === 'COMPLETED' ? 'bg-matcha-500/20' :
                        task.status === 'RUNNING' ? 'bg-cyan-500/20 animate-pulse' :
                        task.status === 'FAILED' ? 'bg-red-500/20' :
                        'bg-white/10'}
                    `}
                  >
                    {task.status === 'COMPLETED' && <span>✓</span>}
                    {task.status === 'RUNNING' && <span className="animate-spin">⚡</span>}
                    {task.status === 'FAILED' && <span className="text-red-400">✗</span>}
                    {task.status === 'PENDING' && <span className="text-white/60">⏳</span>}
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      {task.workflow?.name || 'Unknown workflow'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                      {task.ip?.nickname && (
                        <span className="flex items-center gap-1">
                          <span>👤</span> {task.ip.nickname}
                        </span>
                      )}
                      <span>•</span>
                      <span>{new Date(task.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Status & Action */}
                <div className="flex items-center gap-4">
                  {/* Status Badge */}
                  <StatusBadge status={task.status} />

                  {/* Video link */}
                  {task.result?.videoUrl && (
                    <a
                      href={task.result.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-matcha-600 to-matcha-500 text-white text-sm font-medium shadow-lg shadow-matcha-500/30 hover:shadow-xl transition-all"
                    >
                      查看视频 →
                    </a>
                  )}
                </div>
              </div>

              {/* Error message */}
              {task.error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-300">错误: {task.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-white/10', text: 'text-white/80', label: '等待中' },
    RUNNING: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', label: '执行中' },
    COMPLETED: { bg: 'bg-matcha-500/20', text: 'text-matcha-300', label: '已完成' },
    FAILED: { bg: 'bg-red-500/20', text: 'text-red-300', label: '失败' },
  }
  const config = configs[status] || configs.PENDING

  return (
    <span
      className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  )
}
