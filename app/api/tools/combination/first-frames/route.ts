import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/first-frames
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 获取用户 IP
    const ips = await db.virtualIp.findMany({
      where: { userId },
      select: { id: true },
    })
    const ipIds = ips.map(ip => ip.id)

    // 获取用户的定妆图
    const styleImages = await db.styleImage.findMany({
      where: { ipId: { in: ipIds } },
      include: {
        firstFrames: { select: { id: true, sceneId: true } },
      },
    })

    // 获取用户有权限的场景（公共 + 自己的）
    const scenes = await db.material.findMany({
      where: {
        type: 'SCENE',
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
      select: { id: true, name: true, url: true },
    })

    interface FirstFrameCombination {
  id: string
  scene: { id: string; name: string; url: string | null }
  styleImage: { id: string; url: string }
  productId: string
  ipId: string
  existingFirstFrameId: string | null
}

// 构建可用组合
const combinations: FirstFrameCombination[] = []
    for (const styleImage of styleImages) {
      const existingFirstFrameMap = new Map(
        styleImage.firstFrames.map(f => [f.sceneId, f.id])
      )

      for (const scene of scenes) {
        if (existingFirstFrameMap.has(scene.id)) continue

        combinations.push({
          id: `${scene.id}-${styleImage.id}`,
          scene,
          styleImage: {
            id: styleImage.id,
            url: styleImage.url,
          },
          productId: styleImage.productId,
          ipId: styleImage.ipId,
          existingFirstFrameId: null,
        })
      }
    }

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}