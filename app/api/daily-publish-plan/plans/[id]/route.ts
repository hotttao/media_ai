import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// DELETE /api/daily-publish-plan/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const plan = await db.dailyPublishPlan.findUnique({
      where: { id: params.id },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Allow deletion if:
    // 1. It's an unassigned plan (team pool) and user belongs to that team
    // 2. It's owned by the current user
    const canDelete =
      (plan.isUnassigned && plan.userId === session.user.teamId) ||
      plan.userId === session.user.id

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.dailyPublishPlan.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
