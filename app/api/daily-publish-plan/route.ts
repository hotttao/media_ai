import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/daily-publish-plan?date=YYYY-MM-DD
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
    return NextResponse.json({ error: 'invalid date format' }, { status: 400 })
  }

  // Get date range (start of day to end of day)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  try {
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
            images: {
              where: { isMain: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      plans: plans.map(plan => ({
        id: plan.id,
        productId: plan.productId,
        productName: plan.product.name,
        productImage: plan.product.images[0]?.url || null,
        planDate: plan.planDate.toISOString().split('T')[0],
        createdAt: plan.createdAt.toISOString(),
      })),
      count: plans.length,
    })
  } catch (error) {
    console.error('Failed to fetch daily publish plans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/daily-publish-plan
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, planDate } = body

    if (!productId || !planDate) {
      return NextResponse.json({ error: 'productId and planDate are required' }, { status: 400 })
    }

    const date = new Date(planDate)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'invalid date format' }, { status: 400 })
    }

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Add to publish plan (use upsert to handle duplicate adds)
    const plan = await db.dailyPublishPlan.upsert({
      where: {
        uk_daily_publish_plan_user_product_date: {
          userId: session.user.id,
          productId,
          planDate: date,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        productId,
        planDate: date,
      },
    })

    return NextResponse.json({
      id: plan.id,
      productId: plan.productId,
      planDate: plan.planDate.toISOString().split('T')[0],
      createdAt: plan.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to add to daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
