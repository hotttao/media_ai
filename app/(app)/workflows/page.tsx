// app/(app)/workflows/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getWorkflows } from '@/domains/workflow/service'
import { WorkflowCard } from '@/components/workflow/WorkflowCard'

export default async function WorkflowsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const workflows = await getWorkflows()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.code}
            workflow={workflow}
            href={`/workflows/${workflow.code}/wizard`}
          />
        ))}
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-12">
          <p className="text-warm-silver">暂无可用工作流</p>
        </div>
      )}
    </div>
  )
}
