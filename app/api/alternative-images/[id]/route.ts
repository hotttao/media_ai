import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// DELETE /api/alternative-images/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(params.id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }

  try {
    const alternative = await db.alternativeImage.findUnique({
      where: { id: params.id },
    })

    if (!alternative) {
      return NextResponse.json({ error: 'Alternative not found' }, { status: 404 })
    }

    // Check ownership through related resource's teamId
    let teamId: string | null = null
    switch (alternative.materialType) {
      case 'FIRST_FRAME': {
        const ff = await db.firstFrame.findUnique({ where: { id: alternative.relatedId } })
        teamId = ff?.teamId ?? null
        break
      }
      case 'MODEL_IMAGE': {
        const mi = await db.modelImage.findUnique({ where: { id: alternative.relatedId } })
        teamId = mi?.teamId ?? null
        break
      }
      case 'STYLE_IMAGE': {
        const si = await db.styleImage.findUnique({ where: { id: alternative.relatedId } })
        teamId = si?.teamId ?? null
        break
      }
      case 'VIDEO': {
        const v = await db.video.findUnique({ where: { id: alternative.relatedId } })
        teamId = v?.teamId ?? null
        break
      }
    }

    if (!teamId || teamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.alternativeImage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete alternative image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}