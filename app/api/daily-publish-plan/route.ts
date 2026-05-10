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
    // Get plans where isUnassigned=true and team matches OR userId is current user
    const plans = await db.dailyPublishPlan.findMany({
      where: {
        planDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
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
      orderBy: { createdAt: 'desc' },
    })

    type PlanWithProduct = typeof plans[number]

    return NextResponse.json({
      plans: plans.map((plan: PlanWithProduct) => {
        const mainImage = plan.product.images.find(img => img.isMain) || plan.product.images[0]
        return {
          id: plan.id,
          productId: plan.productId,
          productName: plan.product.name,
          productImage: mainImage?.url || null,
          planDate: plan.planDate.toISOString().split('T')[0],
          createdAt: plan.createdAt.toISOString(),
          isUnassigned: plan.isUnassigned,
        }
      }),
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

    // Check if already exists for this user or team unassigned
    const existing = await db.dailyPublishPlan.findFirst({
      where: {
        productId,
        planDate: date,
        OR: [
          { userId: session.user.id },
          { userId: session.user.teamId!, isUnassigned: true },
        ],
      },
    })

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        productId: existing.productId,
        planDate: existing.planDate.toISOString().split('T')[0],
        createdAt: existing.createdAt.toISOString(),
        isUnassigned: existing.isUnassigned,
        message: 'Product already in plan',
      })
    }

    const plan = await db.dailyPublishPlan.create({
      data: {
        userId: session.user.teamId!,
        productId,
        planDate: date,
        isUnassigned: true,
      },
    })

    return NextResponse.json({
      id: plan.id,
      productId: plan.productId,
      planDate: plan.planDate.toISOString().split('T')[0],
      createdAt: plan.createdAt.toISOString(),
      isUnassigned: true,
    })
  } catch (error) {
    console.error('Failed to add to daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/daily-publish-plan - Claim a plan (change from team unassigned to user)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    // Find the plan
    const plan = await db.dailyPublishPlan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Can only claim if it's unassigned and belongs to team
    if (!plan.isUnassigned || plan.userId !== session.user.teamId!) {
      return NextResponse.json({ error: 'Plan already claimed' }, { status: 400 })
    }

    // Delete unassigned and create with userId (to avoid unique constraint issue)
    await db.dailyPublishPlan.delete({
      where: { id: planId },
    })

    const claimed = await db.dailyPublishPlan.create({
      data: {
        userId: session.user.id,
        productId: plan.productId,
        planDate: plan.planDate,
        isUnassigned: false,
      },
    })

    return NextResponse.json({
      id: claimed.id,
      productId: claimed.productId,
      planDate: claimed.planDate.toISOString().split('T')[0],
      createdAt: claimed.createdAt.toISOString(),
      isUnassigned: false,
    })
  } catch (error) {
    console.error('Failed to claim plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
