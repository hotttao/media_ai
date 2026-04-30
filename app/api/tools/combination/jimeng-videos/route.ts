import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/jimeng-videos
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 获取用户的所有首帧图（包含 styleImage.poseId）
    const firstFrames = await db.firstFrame.findMany({
      where: {
        ipId: session.user.teamId ? { userId } : undefined,
      },
      include: {
        styleImage: {
          select: { poseId: true },
        },
      },
      select: {
        id: true,
        ipId: true,
        url: true,
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

    // 获取已生成的视频（用于过滤）
    const existingVideos = await db.video.findMany({
      where: {
        firstFrameId: { not: '' },
      },
      select: {
        id: true,
        firstFrameId: true,
        movementId: true,
      },
    })

    // 构建 firstFrameId + movementId -> videoId 的映射
    const videoMap = new Map<string, string>()
    for (const video of existingVideos) {
      if (video.firstFrameId && video.movementId) {
        videoMap.set(`${video.firstFrameId}-${video.movementId}`, video.id)
      }
    }

    // 构建组合：首帧图 × 可用动作（根据姿势过滤）
    interface JimengVideoCombination {
      id: string
      firstFrame: { id: string; url: string; poseId: string | null }
      movement: { id: string; content: string }
      existingVideoId: string | null
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
        const existingVideoId = videoMap.get(combinationId) || null

        combinations.push({
          id: combinationId,
          firstFrame: {
            id: ff.id,
            url: ff.url,
            poseId,
          },
          movement: {
            id: movement.id,
            content: movement.content,
          },
          existingVideoId,
        })
      }
    }

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
