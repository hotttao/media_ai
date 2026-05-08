import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/daily-publish-plan/ip-products?ipId=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ipId = searchParams.get('ipId')

  if (!ipId) {
    return NextResponse.json({ error: 'ipId is required' }, { status: 400 })
  }

  try {
    // Get IP nickname
    const ip = await db.virtualIp.findUnique({
      where: { id: ipId },
      select: { nickname: true }
    })

    // Get today date range for filtering
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get all VideoPush records for this IP created today (these represent products added to daily plan)
    const videoPushes = await db.videoPush.findMany({
      where: {
        ipId,
        createdAt: { gte: today, lt: tomorrow },
      },
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
          },
        },
      },
    })
    const videoPushProductIds = new Set(videoPushes.map(vp => vp.productId))

    // Count clips per product from VideoPush
    const clipCountByProduct = new Map<string, number>()
    for (const vp of videoPushes) {
      clipCountByProduct.set(vp.productId, (clipCountByProduct.get(vp.productId) || 0) + 1)
    }

    // Check which products have published videos (from all VideoPush for this IP)
    const publishedProducts = await db.videoPush.findMany({
      where: { ipId, isPublished: true },
      select: { productId: true },
    })
    const publishedProductIds = new Set(publishedProducts.map(vp => vp.productId).filter(Boolean))

    // Get product details for products with VideoPush today
    const productsWithClips = await db.product.findMany({
      where: { id: { in: Array.from(videoPushProductIds) } },
      include: {
        images: { where: { isMain: true }, take: 1 },
      },
    })

    // Build products array - only products that have VideoPush records for today
    const products = productsWithClips.map(product => ({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0]?.url || '',
      videoCount: clipCountByProduct.get(product.id) || 0,
      hasPublishedVideos: publishedProductIds.has(product.id),
    }))

    return NextResponse.json({
      ipId,
      ipNickname: ip?.nickname || '',
      products,
    })
  } catch (error) {
    console.error('Failed to fetch IP products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
