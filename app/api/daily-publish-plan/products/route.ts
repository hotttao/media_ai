import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { getCapcutProvider } from '@/foundation/providers/CapcutCliProvider'

export const dynamic = 'force-dynamic'

// GET /api/daily-publish-plan/products?date=2026-05-03
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

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  // Date range for @db.Date field
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  try {
    // Get products in the daily publish plan for this date
    const plans = await db.dailyPublishPlan.findMany({
      where: {
        userId: session.user.id,
        planDate: {
          gte: startOfDay,
          lte: endOfDay,
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

    const products = await Promise.all(
      plans.map(async plan => {
        // Get ipId from any existing video for this product
        const firstVideo = await db.video.findFirst({
          where: { productId: plan.productId },
          select: { ipId: true }
        })
        const ipId = firstVideo?.ipId || ''

        // Direct queries for accurate stats
        const [
          totalVideos,
          qualifiedVideos,
          publishedVideos,
          videoPushes
        ] = await Promise.all([
          // Total AI videos for this product+ip
          db.video.count({
            where: { productId: plan.productId, ipId }
          }),
          // Qualified videos (in videoPush with isQualified=true)
          db.videoPush.count({
            where: { productId: plan.productId, ipId, isQualified: true }
          }),
          // Published videos
          db.videoPush.count({
            where: { productId: plan.productId, ipId, isPublished: true }
          }),
          // Get videoPush records for clippable calculation
          db.videoPush.findMany({
            where: { productId: plan.productId, ipId },
            select: { id: true, url: true }
          })
        ])

        // Calculate clippable count
        let clippableCount = 0
        try {
          if (videoPushes.length > 0) {
            // Get background music
            const musicCount = await db.material.count({
              where: { teamId: session.user.teamId, type: 'BACKGROUND_MUSIC' }
            })
            let musicUrl: string | undefined
            if (musicCount > 0) {
              const music = await db.material.findFirst({
                where: { teamId: session.user.teamId, type: 'BACKGROUND_MUSIC' },
                skip: Math.floor(Math.random() * musicCount)
              })
              musicUrl = music?.url
            }

            // Call capcut dry_run
            const capcut = getCapcutProvider()
            const dryRunResult = await capcut.clipDryRun({
              videoUrls: videoPushes.map(v => v.url),
              musicUrl
            })

            if (!dryRunResult.error) {
              clippableCount = Math.max(0, dryRunResult.count - videoPushes.length)
            }
          }
        } catch (e) {
          console.error('Failed to calculate clippable count:', e)
        }

        // Calculate newGeneratable - estimate based on existing videos
        // If no videos exist yet, show potential; otherwise show 0
        const newGeneratableCount = totalVideos === 0 ? 5 : 0

        return {
          productId: plan.productId,
          productName: plan.product.name,
          productImage: plan.product.images[0]?.url || '',
          ipId,
          aiVideoCount: totalVideos,
          pushableCount: qualifiedVideos - publishedVideos,
          publishedCount: publishedVideos,
          clippableCount,
          newGeneratableCount,
        }
      })
    )

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
