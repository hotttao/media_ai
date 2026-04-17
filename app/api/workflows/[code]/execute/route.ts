// app/api/workflows/[code]/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getWorkflowByCode } from '@/domains/workflow/service'
import { workflowEngine, ExecutionContext } from '@/domains/workflow/engine'
import { createVideoTask, updateTaskResult } from '@/domains/video/service'
import { v4 as uuid } from 'uuid'

type RouteParams = { params: { code: string } }

// POST /api/workflows/:code/execute - 执行工作流
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const workflow = await getWorkflowByCode(params.code)
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const body = await request.json()
    const { ipId, params: userParams } = body

    // 创建任务记录
    const task = await createVideoTask({
      id: uuid(),
      userId: session.user.id,
      teamId: session.user.teamId,
      workflowId: workflow.id,
      ipId: ipId || null,
      params: userParams || {},
    })

    // 执行工作流（异步）
    const context: ExecutionContext = {
      teamId: session.user.teamId,
      ipId: ipId || '',
      userId: session.user.id,
      nodes: {},
    }

    // 异步执行，不阻塞
    workflowEngine.execute(workflow, userParams || {}, context).then(async (result) => {
      await updateTaskResult(task.id, result)
    }).catch(async (error) => {
      await updateTaskResult(task.id, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    })

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      message: 'Task created, execution started',
    }, { status: 201 })
  } catch (error) {
    console.error('Execute workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
