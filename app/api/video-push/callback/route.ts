import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/video-push/callback?videoPushId=xxx-xxx
// 无需认证，CLI 调用此接口通知剪辑完成
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoPushId = searchParams.get('videoPushId')

    if (!videoPushId) {
      return NextResponse.json({ error: 'videoPushId is required' }, { status: 400 })
    }

    const body = await request.json()
    const { status, output, thumbnail, duration, error } = body

    // 验证 status
    if (!['success', 'failed', 'skipped'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // 查找 VideoPush 记录
    const videoPush = await db.videoPush.findUnique({
      where: { id: videoPushId },
    })

    if (!videoPush) {
      return NextResponse.json({ error: 'VideoPush not found' }, { status: 404 })
    }

    // 更新记录
    const updateData: Record<string, unknown> = {
      status: status === 'skipped' ? 'completed' : status,
    }

    if (output) {
      updateData.url = output
    }

    if (thumbnail) {
      updateData.thumbnail = thumbnail
    }

    await db.videoPush.update({
      where: { id: videoPushId },
      data: updateData,
    })

    console.log(`[callback] VideoPush ${videoPushId} updated: status=${status}, url=${output || 'unchanged'}`)

    return NextResponse.json({
      success: true,
      message: `VideoPush ${videoPushId} updated`,
    })
  } catch (error) {
    console.error('[callback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}