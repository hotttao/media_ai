import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/model-images
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const teamId = session.user.teamId

    // 获取团队的所有 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true, nickname: true, fullBodyUrl: true },
    })

    // 获取团队的所有产品
    const products = await db.product.findMany({
      where: { teamId },
      select: { id: true, name: true, images: { where: { isMain: true }, take: 1 } },
    })

    // 获取已生成的模特图
    const existingModelImages = await db.modelImage.findMany({
      where: {
        ipId: { in: ips.map(ip => ip.id) },
        productId: { in: products.map(p => p.id) },
      },
      select: { id: true, ipId: true, productId: true },
    })

    const existingSet = new Set(existingModelImages.map(m => `${m.ipId}-${m.productId}`))

    // 构建所有组合（已生成的标记 existingModelImageId）
    const combinations = ips.flatMap(ip =>
      products
        .map(product => ({
          id: `${ip.id}-${product.id}`,
          ip,
          product: {
            id: product.id,
            name: product.name,
            mainImageUrl: product.images[0]?.url,
          },
          existingModelImageId: existingSet.has(`${ip.id}-${product.id}`) ? 'generated' : null,
        }))
    )

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}