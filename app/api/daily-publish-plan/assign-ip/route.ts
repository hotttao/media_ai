import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/daily-publish-plan/assign-ip
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, ipId, date } = body

    if (!productId || !ipId) {
      return NextResponse.json({ error: 'productId and ipId are required' }, { status: 400 })
    }

    // Check if VideoPush record already exists for this product+ip
    const existing = await db.videoPush.findFirst({
      where: { productId, ipId },
    })

    if (existing) {
      return NextResponse.json({
        message: 'IP already assigned',
        videoPush: existing,
      })
    }

    // Create new VideoPush record
    // sceneId is required but for assignment we use empty string as placeholder
    // The actual sceneId will be set when videos are selected
    const videoPush = await db.videoPush.create({
      data: {
        productId,
        ipId,
        sceneId: '', // Placeholder, will be updated when videos are selected
        videoId: '', // No videos selected yet
        videoIdHash: '', // No videos yet
        status: 'pending',
        isQualified: false,
        isPublished: false,
      },
    })

    return NextResponse.json({
      message: 'IP assigned successfully',
      videoPush,
    })
  } catch (error) {
    console.error('Failed to assign IP to daily publish plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}