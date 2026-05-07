import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/daily-publish-plan/confirm-publish
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, ipId, videoIds } = body

    if (!productId || !ipId) {
      return NextResponse.json({ error: 'productId and ipId are required' }, { status: 400 })
    }

    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'videoIds array is required' }, { status: 400 })
    }

    // Find all VideoPush records for this product+ip that contain any of the selected videoIds
    // Note: VideoPush.videoId stores comma-separated video IDs, so we need to search within that string
    const allVideoPushes = await db.videoPush.findMany({
      where: {
        productId,
        ipId,
      },
      select: {
        id: true,
        videoId: true,
      },
    })

    // Filter to find records that contain any of the selected videoIds
    const videoIdsSet = new Set(videoIds)
    const recordsToUpdate: string[] = []

    for (const vp of allVideoPushes) {
      const storedVideoIds = vp.videoId.split(',').map(id => id.trim()).filter(Boolean)
      const hasMatch = storedVideoIds.some(id => videoIdsSet.has(id))
      if (hasMatch) {
        recordsToUpdate.push(vp.id)
      }
    }

    // Update all matching records to isPublished=true
    if (recordsToUpdate.length > 0) {
      await db.videoPush.updateMany({
        where: {
          id: { in: recordsToUpdate },
        },
        data: {
          isPublished: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${recordsToUpdate.length} record(s)`,
      updatedCount: recordsToUpdate.length,
    })
  } catch (error) {
    console.error('Failed to confirm publish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
