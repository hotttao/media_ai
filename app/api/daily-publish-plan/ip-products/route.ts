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

    // Get all product IDs that have videos for this IP (from Video table)
    const videos = await db.video.findMany({
      where: { ipId },
      select: { productId: true },
    })
    const videoCountByProduct = new Map<string, number>()
    const productIdsWithVideos = new Set<string>()
    for (const v of videos) {
      if (v.productId) {
        productIdsWithVideos.add(v.productId)
        videoCountByProduct.set(v.productId, (videoCountByProduct.get(v.productId) || 0) + 1)
      }
    }

    // Get all VideoPush records for this IP (to get product info and published status)
    const videoPushes = await db.videoPush.findMany({
      where: { ipId },
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
          },
        },
      },
    })
    const videoPushProductIds = new Set(videoPushes.map(vp => vp.productId))

    // Check which products have published videos
    const publishedProducts = await db.videoPush.findMany({
      where: { ipId, isPublished: true },
      select: { productId: true },
    })
    const publishedProductIds = new Set(publishedProducts.map(vp => vp.productId).filter(Boolean))

    // Build set of all product IDs (both with VideoPush records AND with Video records)
    const allProductIds = new Set([...videoPushProductIds, ...productIdsWithVideos])

    // Get product details for all relevant products
    const productsWithVideos = await db.product.findMany({
      where: { id: { in: Array.from(allProductIds) } },
      include: {
        images: { where: { isMain: true }, take: 1 },
      },
    })

    // Build products array
    const products = productsWithVideos.map(product => ({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0]?.url || '',
      videoCount: videoCountByProduct.get(product.id) || 0,
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
