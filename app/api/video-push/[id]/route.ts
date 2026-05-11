import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type VideoPushUpdateInput = {
  isQualified?: boolean
  isPublished?: boolean
  thumbnail?: string
  title?: string
  content?: string
}

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

// PATCH /api/video-push/:id - Mark qualified/unqualified
export async function PATCH(
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
    const body = await request.json()
    const { qualified, published, thumbnail, title, content } = body

    const updateData: VideoPushUpdateInput = {}
    if (typeof qualified === 'boolean') updateData.isQualified = qualified
    if (typeof published === 'boolean') updateData.isPublished = published
    if (typeof thumbnail === 'string') updateData.thumbnail = thumbnail
    if (typeof title === 'string') updateData.title = title
    if (typeof content === 'string') updateData.content = content

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const videoPush = await verifyTeamOwnership(params.id, session.user.teamId)
    if (!videoPush) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await db.videoPush.update({
      where: { id: videoPush.id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update video push:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/video-push/:id
export async function DELETE(
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

    await db.videoPush.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete video push:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}