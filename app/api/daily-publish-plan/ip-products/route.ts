import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/daily-publish-plan/ip-products?ipId=xxx&date=yyyy-mm-dd
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ipId = searchParams.get('ipId')
  const date = searchParams.get('date') // yyyy-mm-dd format

  if (!ipId) {
    return NextResponse.json({ error: 'ipId is required' }, { status: 400 })
  }

  try {
    // Get IP nickname
    const ip = await db.virtualIp.findUnique({
      where: { id: ipId },
      select: { nickname: true }
    })

    // Get VideoPush records for this IP on this date (if date provided)
    const videoPushWhere: any = { ipId }
    if (date) {
      const planDate = new Date(date)
      planDate.setHours(0, 0, 0, 0)
      const nextDate = new Date(planDate)
      nextDate.setDate(nextDate.getDate() + 1)

      videoPushWhere.createdAt = {
        gte: planDate,
        lt: nextDate,
      }
    }

    const videoPushes = await db.videoPush.findMany({
      where: videoPushWhere,
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
          },
        },
      },
    })

    // Group by product
    const productMap = new Map<string, {
      product: any
      totalClips: number
      publishedClips: number
    }>()

    for (const vp of videoPushes) {
      if (!productMap.has(vp.productId)) {
        productMap.set(vp.productId, {
          product: vp.product,
          totalClips: 0,
          publishedClips: 0,
        })
      }
      const entry = productMap.get(vp.productId)!
      entry.totalClips++
      if (vp.isPublished) entry.publishedClips++
    }

    // Build products array from VideoPush records
    const productsWithClips = Array.from(productMap.values()).map(({ product, totalClips, publishedClips }) => ({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0]?.url || '',
      videoCount: totalClips,
      publishedCount: publishedClips,
      isInPlan: true, // If it has VideoPush records, it's in the plan
    }))

    // Also get products from daily plan for this IP on this date
    let planProducts: any[] = []
    if (date) {
      const planDate = new Date(date)
      planDate.setHours(0, 0, 0, 0)
      const nextDate = new Date(planDate)
      nextDate.setDate(nextDate.getDate() + 1)

      const plans = await db.dailyPublishPlan.findMany({
        where: {
          planDate: {
            gte: planDate,
            lt: nextDate,
          },
        },
        include: {
          product: {
            include: {
              images: { where: { isMain: true }, take: 1 },
            },
          },
        },
      })

      // Filter plans where the product is associated with this IP
      // First get all productIds that have VideoPush for this IP
      const productIdsWithIp = new Set(videoPushes.map(vp => vp.productId))

      planProducts = plans
        .filter(plan => productIdsWithIp.has(plan.productId))
        .map(plan => ({
          productId: plan.product.id,
          productName: plan.product.name,
          productImage: plan.product.images[0]?.url || '',
          videoCount: 0,
          publishedCount: 0,
          isInPlan: true,
        }))
    }

    // Merge and deduplicate
    const productIdsSeen = new Set<string>()
    const allProducts: any[] = []

    // First add products with clips
    for (const p of productsWithClips) {
      productIdsSeen.add(p.productId)
      allProducts.push(p)
    }

    // Then add plan products that don't have clips yet
    for (const pp of planProducts) {
      if (!productIdsSeen.has(pp.productId)) {
        allProducts.push(pp)
      }
    }

    return NextResponse.json({
      ipId,
      ipNickname: ip?.nickname || '',
      products: allProducts,
    })
  } catch (error) {
    console.error('Failed to fetch IP products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}