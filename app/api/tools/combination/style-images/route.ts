import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/style-images
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 获取用户的 IP
    const ips = await db.virtualIp.findMany({
      where: { userId },
      select: { id: true },
    })
    const ipIds = ips.map(ip => ip.id)

    // 获取这些 IP 的所有模特图
    const modelImages = await db.modelImage.findMany({
      where: { ipId: { in: ipIds } },
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

    // 构建可用组合
    const combinations: any[] = []
    for (const modelImage of modelImages) {
      const existingStyleImageMap = new Map(
        modelImage.styleImages.map(s => [s.poseId, s.id])
      )

      for (const pose of poses) {
        if (existingStyleImageMap.has(pose.id)) continue

        combinations.push({
          id: `${pose.id}-${modelImage.id}`,
          pose,
          modelImage: {
            id: modelImage.id,
            url: modelImage.url,
            productName: productMap.get(modelImage.productId),
          },
          existingStyleImageId: null,
        })
      }
    }

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}