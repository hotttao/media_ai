import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/foundation/lib/db'
import * as fs from 'fs'
import * as path from 'path'

export const dynamic = 'force-dynamic'

// POST /api/video-push/callback?videoPushId=xxx-xxx
// 无需认证，CLI 调用此接口通知剪辑完成
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let videoPushId = searchParams.get('videoPushId')

    const body = await request.json()
    const { status, output, thumbnail, duration, error, videoPushId: bodyVideoPushId } = body

    // 如果 query param 没有 videoPushId，尝试从 body 获取
    if (!videoPushId && bodyVideoPushId) {
      videoPushId = bodyVideoPushId
    }

    if (!videoPushId) {
      return NextResponse.json({ error: 'videoPushId is required' }, { status: 400 })
    }

    console.log(`[callback] Received: videoPushId=${videoPushId}, status=${status}, output=${output}`)

    // 验证 status
    if (!['success', 'failed', 'skipped'].includes(status)) {
      console.log(`[callback] Invalid status: ${status}`)
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // 查找 VideoPush 记录及其关联的 Product（用于获取 teamId）
    const videoPush = await db.videoPush.findUnique({
      where: { id: videoPushId },
      include: { product: true },
    })

    if (!videoPush) {
      console.log(`[callback] VideoPush not found: ${videoPushId}`)
      return NextResponse.json({ error: 'VideoPush not found' }, { status: 404 })
    }

    // 更新记录
    // CLI 发来 'success' 表示生成成功（文件已产出）→ DB 存 'completed'
    // 'skipped' 表示幂等跳过（文件已存在）→ DB 存 'completed'
    // 'failed' → DB 存 'failed'
    const dbStatus = (status === 'success' || status === 'skipped') ? 'completed' : status
    const updateData: Record<string, unknown> = { status: dbStatus }

    if (output) {
      // CLI 只返回文件名如 "clip-xxx_luxury.mp4"
      // 格式: /uploads/teams/{teamId}/clips/{filename}
      const teamId = videoPush.product.teamId
      const clipsDir = path.join(process.cwd(), 'public', 'uploads', 'teams', teamId, 'clips')
      const fullLocalPath = path.join(clipsDir, output)

      console.log(`[callback] Checking file existence: ${fullLocalPath}`)
      if (fs.existsSync(fullLocalPath)) {
        // 文件存在，构建可访问的 URL
        const fileUrl = `/uploads/teams/${teamId}/clips/${output}`
        updateData.url = fileUrl
        console.log(`[callback] File exists, URL: ${fileUrl}`)
      } else {
        console.log(`[callback] File not found: ${fullLocalPath}`)
        // 文件不存在，但仍然更新状态（CLI 已处理）
        updateData.url = output
      }
    }

    if (thumbnail) {
      updateData.thumbnail = thumbnail
    }

    console.log(`[callback] Updating VideoPush ${videoPushId} with data:`, JSON.stringify(updateData))
    await db.videoPush.update({
      where: { id: videoPushId },
      data: updateData,
    })
    console.log(`[callback] VideoPush ${videoPushId} updated successfully`)

    return NextResponse.json({
      success: true,
      message: `VideoPush ${videoPushId} updated`,
    })
  } catch (error) {
    console.error('[callback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}