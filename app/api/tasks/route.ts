// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getTasks } from '@/domains/video/service'

export const dynamic = 'force-dynamic'

// GET /api/tasks - 任务列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const tasks = await getTasks(session.user.teamId)

    return NextResponse.json(tasks.map(t => ({
      id: t.id,
      workflowName: t.workflow?.name,
      ipName: t.ip?.nickname,
      status: t.status,
      error: t.error,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })))
  } catch (error) {
    console.error('List tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
