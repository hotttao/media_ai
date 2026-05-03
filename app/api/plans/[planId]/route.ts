import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// DELETE /api/daily-publish-plan/:planId
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const plan = await db.dailyPublishPlan.findUnique({
      where: { id: params.planId },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Verify ownership
    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.dailyPublishPlan.delete({
      where: { id: params.planId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
