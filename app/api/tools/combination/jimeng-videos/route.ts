import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/jimeng-videos?productId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const teamId = session.user.teamId as string

    // 获取该产品的首帧图（只获取有 styleImage 关联的）
    const firstFrameWhere: any = {
      styleImageId: { not: '' },
    }

    if (productId) {
      firstFrameWhere.productId = productId
    } else {
      // 没有 productId 时，获取团队所有产品的首帧图
      const products = await db.product.findMany({
        where: { teamId },
        select: { id: true },
      })
      const productIds = products.map(p => p.id)
      firstFrameWhere.productId = { in: productIds }
    }

    const firstFrames = await db.firstFrame.findMany({
      where: firstFrameWhere,
      include: {
        styleImage: {
          select: { poseId: true },
        },
      },
    })

    // 获取所有可用的动作（MovementMaterial）
    const movements = await db.movementMaterial.findMany({
      select: {
        id: true,
        content: true,
        isGeneral: true,
        poseLinks: {
          select: {
            poseId: true,
          },
        },
      },
    })

    // 获取已生成的视频（添加 teamId 过滤）
    const firstFrameIds = firstFrames.map(ff => ff.id)
    const existingVideos = await db.video.findMany({
      where: {
        firstFrameId: { not: '' },
        firstFrameId: { in: firstFrameIds },
      },
      select: {
        id: true,
        firstFrameId: true,
        movementId: true,
        url: true,
      },
    })

    // 构建 firstFrameId + movementId -> video info 的映射
    const videoMap = new Map<string, { id: string; url: string }>()
    for (const video of existingVideos) {
      if (video.firstFrameId && video.movementId) {
        videoMap.set(`${video.firstFrameId}-${video.movementId}`, { id: video.id, url: video.url })
      }
    }

    // 构建组合：首帧图 × 可用动作（根据姿势过滤）
    interface JimengVideoCombination {
      id: string
      firstFrame: { id: string; url: string; poseId: string | null; productId: string }
      movement: { id: string; content: string }
      existingVideoId: string | null
      resultUrl: string | null
    }

    const combinations: JimengVideoCombination[] = []

    for (const ff of firstFrames) {
      const poseId = ff.styleImage?.poseId || null

      for (const movement of movements) {
        // 动作过滤：如果首帧图有 poseId，只显示 isGeneral=true 或者关联的 poseId 在列表中的动作
        if (poseId) {
          const hasPoseLink = movement.poseLinks.some(link => link.poseId === poseId)
          if (!movement.isGeneral && !hasPoseLink) {
            continue
          }
        }

        const combinationId = `${ff.id}-${movement.id}`
        const videoInfo = videoMap.get(combinationId)

        combinations.push({
          id: combinationId,
          firstFrame: {
            id: ff.id,
            url: ff.url,
            poseId,
            productId: ff.productId,
          },
          movement: {
            id: movement.id,
            content: movement.content,
          },
          existingVideoId: videoInfo?.id ?? null,
          resultUrl: videoInfo?.url ?? null,
        })
      }
    }

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
