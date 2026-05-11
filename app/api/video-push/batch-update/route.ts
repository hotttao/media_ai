import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/video-push/batch-update
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array required' }, { status: 400 })
    }

    const results = []
    for (const update of updates) {
      const { videoPushId, thumbnail, title, content, isQualified, isPublished } = update

      const updateData: any = {}
      if (typeof thumbnail === 'string') updateData.thumbnail = thumbnail
      if (typeof title === 'string') updateData.title = title
      if (typeof content === 'string') updateData.content = content
      if (typeof isQualified === 'boolean') updateData.isQualified = isQualified
      if (typeof isPublished === 'boolean') updateData.isPublished = isPublished

      if (Object.keys(updateData).length > 0) {
        const updated = await db.videoPush.update({
          where: { id: videoPushId },
          data: updateData,
        })
        results.push(updated)
      }
    }

    return NextResponse.json({ updated: results.length, records: results })
  } catch (error) {
    console.error('Batch update failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}