// app/(app)/workflows/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { WorkflowCard } from '@/components/workflow/WorkflowCard'

interface Workflow {
  code: string
  name: string
  description?: string
  nodeCount?: number
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workflows')
      .then(res => res.json())
      .then(data => {
        setWorkflows(data)
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
      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-2xl" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <div className="text-6xl mb-4">⚡</div>
          <p className="text-white/60">暂无可用工作流</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.code}
              workflow={workflow}
              href={`/workflows/${workflow.code}/wizard`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
