import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/model-images
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // 获取用户的所有 IP
  const ips = await db.virtualIp.findMany({
    where: { userId },
    select: { id: true, nickname: true, fullBodyUrl: true },
  })

  // 获取用户的所有产品
  const products = await db.product.findMany({
    where: { userId },
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

  // 构建可用组合（排除已生成的）
  const combinations = ips.flatMap(ip =>
    products
      .filter(p => !existingSet.has(`${ip.id}-${p.id}`))
      .map(product => ({
        id: `${ip.id}-${product.id}`,
        ip,
        product: {
          id: product.id,
          name: product.name,
          mainImageUrl: product.images[0]?.url,
        },
        existingModelImageId: null,
      }))
  )

  return NextResponse.json(combinations)
}