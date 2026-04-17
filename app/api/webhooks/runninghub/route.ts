// app/api/webhooks/runninghub/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateTaskResult } from '@/domains/video/service'
import { db } from '@/foundation/lib/db'

// POST /api/webhooks/runninghub - RunningHub 回调
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, status, results, errorMessage } = body

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
    }

    // 查找对应的任务
    // RunningHub 回调可能不包含 taskId 映射，需要通过额外字段查找
    // 这里简化处理，假设 taskId 就是我们的 VideoTask id
    const task = await db.videoTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 更新任务结果
    const result = status === 'SUCCESS'
      ? { success: true, videoUrl: results?.[0]?.url }
      : { success: false, error: errorMessage || 'Task failed' }

    await updateTaskResult(taskId, result)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}