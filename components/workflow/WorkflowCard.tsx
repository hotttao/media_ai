// components/workflow/WorkflowCard.tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface WorkflowCardProps {
  workflow: {
    code: string
    name: string
    description?: string
    nodeCount?: number
  }
  href: string
}

export function WorkflowCard({ workflow, href }: WorkflowCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:border-matcha-600 transition-colors cursor-pointer h-full">
        <CardHeader>
          <CardTitle>{workflow.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workflow.description && (
            <p className="text-sm text-warm-silver">{workflow.description}</p>
          )}
          {workflow.nodeCount !== undefined && (
            <p className="text-xs text-warm-silver">
              {workflow.nodeCount} 个处理节点
            </p>
          )}
          <Button className="w-full">开始生成</Button>
        </CardContent>
      </Card>
    </Link>
  )
}
