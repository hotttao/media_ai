import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/daily-publish-plan/remove-plan
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { productId, date } = await request.json()

    if (!productId || !date) {
      return NextResponse.json({ error: 'productId and date are required' }, { status: 400 })
    }

    const planDate = new Date(date)
    if (isNaN(planDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Delete the daily publish plan record
    // Allow deleting if it's owned by user OR if it's an unassigned team plan
    await db.dailyPublishPlan.deleteMany({
      where: {
        productId,
        planDate,
        OR: [
          { userId: session.user.id },
          { userId: session.user.teamId!, isUnassigned: true },
        ],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}