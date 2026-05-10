import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// POST /api/daily-publish-plan/batch
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productIds, planDate } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds array is required' }, { status: 400 })
    }

    if (!planDate) {
      return NextResponse.json({ error: 'planDate is required' }, { status: 400 })
    }

    const date = new Date(planDate)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'invalid date format' }, { status: 400 })
    }

    const results = {
      added: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const productId of productIds) {
      try {
        // Check if product exists
        const product = await db.product.findUnique({
          where: { id: productId },
        })
        if (!product) {
          results.errors.push(`Product ${productId} not found`)
          continue
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
          results.skipped++
          continue
        }

        // Create with isUnassigned flag - product is in team pool, not assigned to anyone
        await db.dailyPublishPlan.create({
          data: {
            userId: session.user.teamId!,
            productId,
            planDate: date,
            isUnassigned: true,
          },
        })
        results.added++
      } catch (err) {
        results.skipped++
        console.error(`Failed to add product ${productId}:`, err)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to batch add to daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
