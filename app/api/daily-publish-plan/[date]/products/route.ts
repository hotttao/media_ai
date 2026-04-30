import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider, CombinationType } from '@/domains/combination'

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
          }
        }

        // 使用组合引擎计算视频统计
        const result = await engine.compute(plan.productId, ipId, {
          type: CombinationType.VIDEO
        })

        return {
          productId: plan.productId,
          productName: plan.product.name,
          productImage: plan.product.images[0]?.url || '',
          ipId,
          aiVideoCount: result.stats.generated,  // 已生成视频数
          pushableCount: result.stats.pending,   // 可发布数 (qualified - published)
          publishedCount: result.stats.published, // 已发布数
        }
      })
    )

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}