import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider, CombinationType } from '@/domains/combination'
import { getCapcutProvider } from '@/foundation/providers/CapcutCliProvider'

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

    // 初始化组合引擎
    const registry = new ConstraintRegistry()
    const poolProvider = new PrismaMaterialPoolProvider(db)
    const engine = new CombinationEngine(registry, poolProvider)

    const products = await Promise.all(
      plans.map(async plan => {
        // Get ipId from first video or use empty string
        const firstVideo = plan.product.videos[0]
        const ipId = firstVideo?.ipId || ''

        // 如果没有 ipId，跳过组合引擎计算
        if (!ipId) {
          return {
            productId: plan.productId,
            productName: plan.product.name,
            productImage: plan.product.images[0]?.url || '',
            ipId: '',
            aiVideoCount: 0,
            pushableCount: 0,
            publishedCount: 0,
            clippableCount: 0,
            newGeneratableCount: 0,
          }
        }

        // 使用组合引擎计算视频统计
        const result = await engine.compute(plan.productId, ipId, {
          type: CombinationType.VIDEO
        })

        // 获取可剪辑数 - 直接计算
        let clippableCount = 0
        try {
          // 获取该产品的所有 AI 视频
          const videos = await db.video.findMany({
            where: { productId: plan.productId, ipId },
            select: { id: true, url: true }
          })

          if (videos.length > 0) {
            // 获取背景音乐
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

            // 调用 cap_cut dry_run
            const capcut = getCapcutProvider()
            const dryRunResult = await capcut.clipDryRun({
              videoUrls: videos.map(v => v.url),
              musicUrl
            })

            if (!dryRunResult.error) {
              // 获取已存在的剪辑数量
              const existingClipCount = await db.videoPush.count({
                where: { productId: plan.productId, ipId }
              })
              clippableCount = Math.max(0, dryRunResult.count - existingClipCount)
            }
          }
        } catch (e) {
          console.error('Failed to calculate clippable count:', e)
        }

        return {
          productId: plan.productId,
          productName: plan.product.name,
          productImage: plan.product.images[0]?.url || '',
          ipId,
          aiVideoCount: result.stats.generated,  // 已生成视频数
          pushableCount: result.stats.pending,   // 可发布数 (qualified - published)
          publishedCount: result.stats.published, // 已发布数
          clippableCount,  // 可剪辑数
          newGeneratableCount: result.stats.newGeneratable,  // 可新增AI视频数
        }
      })
    )

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}