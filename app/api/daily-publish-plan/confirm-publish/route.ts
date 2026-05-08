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

    // Determine if videoIds are VideoPush IDs or source video IDs
    // Try to find VideoPush records directly first
    let videoPushIds: string[] = []

    // Check if any of the IDs exist as VideoPush IDs directly
    const directMatches = await db.videoPush.findMany({
      where: {
        id: { in: videoIds },
        productId,
        ipId,
      },
      select: { id: true },
    })

    if (directMatches.length > 0) {
      // These are VideoPush IDs
      videoPushIds = directMatches.map(vp => vp.id)
    } else {
      // These are source video IDs, find matching VideoPush records
      // by searching within the comma-separated videoId field
      const allVideoPushes = await db.videoPush.findMany({
        where: { productId, ipId },
        select: { id: true, videoId: true },
      })

      const videoIdsSet = new Set(videoIds)
      for (const vp of allVideoPushes) {
        const storedVideoIds = vp.videoId.split(',').map(id => id.trim()).filter(Boolean)
        const hasMatch = storedVideoIds.some(id => videoIdsSet.has(id))
        if (hasMatch) {
          videoPushIds.push(vp.id)
        }
      }
    }

    // Update all matching records to isPublished=true
    if (videoPushIds.length > 0) {
      await db.videoPush.updateMany({
        where: { id: { in: videoPushIds } },
        data: { isPublished: true },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${videoPushIds.length} record(s)`,
      updatedCount: videoPushIds.length,
    })
  } catch (error) {
    console.error('Failed to confirm publish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
