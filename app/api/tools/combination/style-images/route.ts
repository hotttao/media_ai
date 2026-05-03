import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/style-images?productId=xxx
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

    // 获取团队的 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true },
    })
    const ipIds = ips.map(ip => ip.id)

    // 获取这些 IP 的所有模特图（可按 productId 过滤）
    const modelImageWhere: any = { ipId: { in: ipIds } }
    if (productId) {
      modelImageWhere.productId = productId
    }

    const modelImages = await db.modelImage.findMany({
      where: modelImageWhere,
      include: {
        styleImages: { select: { id: true, poseId: true } },
      },
    })

    // 获取所有产品信息
    const productIds = [...new Set(modelImages.map(m => m.productId))]
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    })
    const productMap = new Map(products.map(p => [p.id, p.name]))

    // 获取所有可用姿势（公共 + 自己的）
    const poses = await db.material.findMany({
      where: { type: 'POSE', OR: [{ userId }, { visibility: 'PUBLIC' }] },
      select: { id: true, name: true, url: true },
    })

    interface StyleImageCombination {
      id: string
      pose: { id: string; name: string; url: string | null }
      modelImage: { id: string; url: string; productName?: string | null }
      existingStyleImageId: string | null
    }

    // 构建所有组合（已生成的标记 existingStyleImageId）
    const combinations: StyleImageCombination[] = []
    for (const modelImage of modelImages) {
      const existingStyleImageMap = new Map(
        modelImage.styleImages.map(s => [s.poseId, s.id])
      )

      for (const pose of poses) {
        const existingId = existingStyleImageMap.get(pose.id) || null
        combinations.push({
          id: `${pose.id}-${modelImage.id}`,
          pose,
          modelImage: {
            id: modelImage.id,
            url: modelImage.url,
            productName: productMap.get(modelImage.productId),
          },
          existingStyleImageId: existingId,
        })
      }
    }

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}