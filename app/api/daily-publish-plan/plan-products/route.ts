import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/daily-publish-plan/plan-products?date=yyyy-mm-dd
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')

  if (!dateStr) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Get products in the daily publish plan for this date
    // Get plans where isUnassigned=true and team matches OR userId is current user
    const plans = await db.dailyPublishPlan.findMany({
      where: {
        planDate: date,
        OR: [
          { userId: session.user.teamId!, isUnassigned: true },
          { userId: session.user.id },
        ],
      },
      include: {
        product: {
          include: {
            images: true,
          },
        },
      },
    })

    type PlanWithProduct = typeof plans[number]

    const products = plans.map((plan: PlanWithProduct) => {
      const mainImage = plan.product.images.find(img => img.isMain) || plan.product.images[0]
      return {
        planId: plan.id,
        productId: plan.productId,
        productName: plan.product.name,
        productImage: mainImage?.url || '',
        isUnassigned: plan.isUnassigned,
        videoCount: 0,
        publishedCount: 0,
        ipId: null as string | null,
        ipNickname: null as string | null,
      }
    })

    // Get video counts and IP associations in efficient queries
    const productIds = plans.map(p => p.productId)
    if (productIds.length > 0) {
      // Get video counts
      const videoCounts = await db.video.groupBy({
        by: ['productId'],
        where: { productId: { in: productIds } },
        _count: true,
      })
      const videoCountMap = new Map(videoCounts.map(v => [v.productId, v._count]))

      const publishedCounts = await db.videoPush.groupBy({
        by: ['productId'],
        where: { productId: { in: productIds }, isPublished: true },
        _count: true,
      })
      const publishedCountMap = new Map(publishedCounts.map(v => [v.productId, v._count]))

      // Get IP associations from VideoPush
      const videoPushes = await db.videoPush.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, ipId: true },
        orderBy: { createdAt: 'desc' },
      })

      // Get the latest IP assignment for each product
      const latestIpMap = new Map<string, { ipId: string; ipNickname: string }>()
      for (const vp of videoPushes) {
        if (!latestIpMap.has(vp.productId) && vp.ipId) {
          latestIpMap.set(vp.productId, { ipId: vp.ipId, ipNickname: '' })
        }
      }

      // Batch fetch IP nicknames
      if (latestIpMap.size > 0) {
        const ipIds = [...new Set([...latestIpMap.values()].map(v => v.ipId))]
        const ips = await db.virtualIp.findMany({
          where: { id: { in: ipIds } },
          select: { id: true, nickname: true },
        })
        const ipNicknameMap = new Map(ips.map(ip => [ip.id, ip.nickname]))

        for (const [productId, ipInfo] of latestIpMap) {
          ipInfo.ipNickname = ipNicknameMap.get(ipInfo.ipId) || ''
        }
      }

      // Assign counts and IP info to products
      for (const p of products) {
        p.videoCount = videoCountMap.get(p.productId) || 0
        p.publishedCount = publishedCountMap.get(p.productId) || 0
        const ipInfo = latestIpMap.get(p.productId)
        if (ipInfo) {
          p.ipId = ipInfo.ipId
          p.ipNickname = ipInfo.ipNickname
        }
      }
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch plan products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}