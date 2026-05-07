import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/daily-publish-plan/:date/products
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const date = new Date(params.date)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Get products in the daily publish plan for this date
    const plans = await db.dailyPublishPlan.findMany({
      where: {
        userId: session.user.id,
        planDate: date,
      },
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
          },
        },
      },
    })

    const products = await Promise.all(
      plans.map(async plan => {
        // Get all unique ipIds for this product from video table
        const videos = await db.video.findMany({
          where: { productId: plan.productId },
          select: { ipId: true },
        })

        // Get unique ipIds (filter out null/empty)
        const uniqueIpIds = [...new Set(videos.map(v => v.ipId).filter(Boolean))] as string[]

        // Get VideoPush records for this product to determine selected status
        const videoPushes = await db.videoPush.findMany({
          where: { productId: plan.productId },
          select: { ipId: true },
        })
        const pushedIpIds = new Set(videoPushes.map(vp => vp.ipId).filter(Boolean))

        // Build ips array with video count and selected status
        const ips = uniqueIpIds.map(ipId => ({
          ipId,
          selected: pushedIpIds.has(ipId),
          videoCount: videos.filter(v => v.ipId === ipId).length,
        }))

        return {
          productId: plan.productId,
          productName: plan.product.name,
          productImage: plan.product.images[0]?.url || '',
          ips,
        }
      })
    )

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}