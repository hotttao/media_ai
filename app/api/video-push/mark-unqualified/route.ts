import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/video-push/mark-unqualified
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, ipId, videoIds, qualified = false } = body

    // 1. 验证必填参数
    if (!productId || !ipId || !videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'productId, ipId, videoIds[] are required' },
        { status: 400 }
      )
    }

    // 2. 构建查询条件：productId + ipId + videoId 匹配
    // videoId 存储为逗号分隔字符串，需要检查是否包含任意一个 videoId
    const videoIdConditions = videoIds.map((vid: string) => ({
      videoId: { contains: vid }
    }))

    // 3. 查找匹配的 VideoPush 记录
    const existingRecords = await db.videoPush.findMany({
      where: {
        productId,
        ipId,
        OR: videoIdConditions,
        product: { teamId: session.user.teamId }
      }
    })

    if (existingRecords.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No matching VideoPush records found',
        updatedCount: 0
      })
    }

    // 4. 更新 isQualified 字段
    const updated = await db.videoPush.updateMany({
      where: {
        id: { in: existingRecords.map(r => r.id) }
      },
      data: {
        isQualified: qualified
      }
    })

    return NextResponse.json({
      success: true,
      message: qualified ? 'Videos marked as qualified' : 'Videos marked as unqualified',
      updatedCount: updated.count
    })
  } catch (error) {
    console.error('Failed to mark unqualified:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
