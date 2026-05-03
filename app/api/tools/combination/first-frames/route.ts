import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { getSceneFilterConfig, filterScenesByConfig } from '@/domains/combination/engine/scene-filter'

// GET /api/tools/combination/first-frames?productId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const userId = session.user.id
    const teamId = session.user.teamId

    // 获取团队 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true },
    })
    const ipIds = ips.map(ip => ip.id)

    // 获取定妆图（可按 productId 过滤）
    const styleImageWhere: any = { ipId: { in: ipIds } }
    if (productId) {
      styleImageWhere.productId = productId
    }

    const styleImages = await db.styleImage.findMany({
      where: styleImageWhere,
      include: {
        firstFrames: { select: { id: true, sceneId: true } },
      },
    })

    // 获取有权限的场景（公共 + 自己的）
    const scenes = await db.material.findMany({
      where: {
        type: 'SCENE',
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
      select: { id: true, name: true, url: true },
    })

    // 获取产品和IP的场景配置
    let productSceneIds = new Set<string>()
    let ipSceneIds = new Set<string>()

    if (productId) {
      // 为每个 IP 获取场景配置（实际上我们需要一个通用的获取方式）
      const [productScenes, allIpScenes] = await Promise.all([
        db.productScene.findMany({
          where: { productId },
          select: { materialId: true },
        }),
        db.virtualIpScene.findMany({
          where: { virtualIpId: { in: ipIds } },
          select: { materialId: true, virtualIpId: true },
        }),
      ])
      productSceneIds = new Set(productScenes.map(ps => ps.materialId))
      // IP 场景需要按 IP 分别存储，但为了简化，如果任何 IP 有配置就使用该配置
      ipSceneIds = new Set(allIpScenes.map(ips => ips.materialId))
    }

    // 过滤场景
    const filteredScenes = filterScenesByConfig(scenes, productSceneIds, ipSceneIds)

    interface FirstFrameCombination {
      id: string
      scene: { id: string; name: string; url: string | null }
      styleImage: { id: string; url: string }
      productId: string
      ipId: string
      existingFirstFrameId: string | null
    }

    // 构建所有组合（已生成的标记 existingFirstFrameId）
    const combinations: FirstFrameCombination[] = []
    for (const styleImage of styleImages) {
      const existingFirstFrameMap = new Map(
        styleImage.firstFrames.map(f => [f.sceneId, f.id])
      )

      for (const scene of filteredScenes) {
        const existingId = existingFirstFrameMap.get(scene.id) || null
        combinations.push({
          id: `${scene.id}-${styleImage.id}`,
          scene,
          styleImage: {
            id: styleImage.id,
            url: styleImage.url,
          },
          productId: styleImage.productId,
          ipId: styleImage.ipId,
          existingFirstFrameId: existingId,
        })
      }
    }

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}