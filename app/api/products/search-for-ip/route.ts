import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/products/search-for-ip?ipId=xxx&filter=published&search=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ipId = searchParams.get('ipId')
  const filter = searchParams.get('filter') || 'all'
  const search = searchParams.get('search') || ''

  if (!ipId) {
    return NextResponse.json({ error: 'ipId is required' }, { status: 400 })
  }

  try {
    const teamId = session.user.teamId!
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    // Get all published productIds for this IP
    const publishedVideoPushes = await db.videoPush.findMany({
      where: {
        ipId,
        isPublished: true,
      },
      select: { productId: true },
    })
    const publishedProductIds = [...new Set(publishedVideoPushes.map(vp => vp.productId))]

    // Get publish count per product for this IP
    const publishCounts: Record<string, number> = {}
    for (const vp of publishedVideoPushes) {
      publishCounts[vp.productId] = (publishCounts[vp.productId] || 0) + 1
    }

    // Get products already in today's daily plan
    const dailyPlanProducts = await db.dailyPublishPlan.findMany({
      where: {
        userId: session.user.id,
        planDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: { productId: true },
    })
    const dailyPlanProductIds = new Set(dailyPlanProducts.map(dp => dp.productId))

    // Get product images for main image
    const productImages = await db.productImage.findMany({
      where: { product: { teamId } },
      select: { productId: true, url: true, isMain: true },
    })
    const mainImageMap: Record<string, string> = {}
    for (const img of productImages) {
      if (img.isMain && !mainImageMap[img.productId]) {
        mainImageMap[img.productId] = img.url
      }
    }

    // Build where clause based on filter
    let whereClause: any = { teamId }

    if (search) {
      whereClause.name = { contains: search }
    }

    let products = await db.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
      },
    })

    // Apply filter
    if (filter === 'published') {
      products = products.filter(p => publishedProductIds.includes(p.id))
    } else if (filter === 'library') {
      products = products.filter(p => !publishedProductIds.includes(p.id))
    }
    // 'all' filter: no additional filtering needed

    // Build response
    const result = products.map(product => {
      const publishCount = publishCounts[product.id] || 0
      return {
        productId: product.id,
        name: product.name,
        image: mainImageMap[product.id] || '',
        publishCount,
        hasGoodData: publishCount >= 3,
        isInDailyPlan: dailyPlanProductIds.has(product.id),
      }
    })

    // Sort by publishCount desc by default (most published first)
    result.sort((a, b) => b.publishCount - a.publishCount)

    return NextResponse.json({ products: result })
  } catch (error) {
    console.error('Search for IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}