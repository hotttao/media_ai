import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function verifyTeamOwnership(id: string, teamId: string) {
  const videoPush = await db.videoPush.findUnique({
    where: { id },
    include: { product: { select: { teamId: true } } }
  })
  if (!videoPush || videoPush.product.teamId !== teamId) {
    return null
  }
  return videoPush
}

// POST /api/video-push/:id/publish - Mark as published
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!uuidRegex.test(params.id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }

  try {
    const videoPush = await verifyTeamOwnership(params.id, session.user.teamId)
    if (!videoPush) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await db.videoPush.update({
      where: { id: params.id },
      data: { isPublished: true },
    })

    return NextResponse.json({
      success: true,
      videoPush: updated,
    })
  } catch (error) {
    console.error('Failed to publish video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}