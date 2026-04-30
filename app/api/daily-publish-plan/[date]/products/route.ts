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
            videos: true,
          },
        },
      },
    })

    const products = await Promise.all(
      plans.map(async plan => {
        // Count AI videos
        const aiVideoCount = plan.product.videos.length

        // Count pushable videos (qualified but not published)
        const pushableCount = await db.videoPush.count({
          where: {
            productId: plan.productId,
            isQualified: true,
            isPublished: false,
          },
        })

        // Count published videos
        const publishedCount = await db.videoPush.count({
          where: {
            productId: plan.productId,
            isPublished: true,
          },
        })

        // Get ipId from first video
        const firstVideo = plan.product.videos[0]
        const ipId = firstVideo?.ipId || ''

        return {
          productId: plan.productId,
          productName: plan.product.name,
          productImage: plan.product.images[0]?.url || '',
          ipId,
          aiVideoCount,
          pushableCount,
          publishedCount,
        }
      })
    )

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}