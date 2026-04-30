import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { getCapcutProvider } from '@/foundation/providers/CapcutCliProvider'

export const dynamic = 'force-dynamic'

// POST /api/video-push/clip
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // 1. Query all AI videos for this product
    const videos = await db.video.findMany({
      where: {
        productId,
        teamId: session.user.teamId,
      },
      select: {
        id: true,
        url: true,
        ipId: true,
      },
    })

    if (videos.length === 0) {
      return NextResponse.json({ error: 'No AI videos found for this product' }, { status: 400 })
    }

    // 2. Randomly select one background music
    const musicCount = await db.material.count({
      where: {
        teamId: session.user.teamId,
        type: 'BACKGROUND_MUSIC',
      },
    })
    let music
    if (musicCount > 0) {
      const randomIndex = Math.floor(Math.random() * musicCount)
      music = await db.material.findFirst({
        where: {
          teamId: session.user.teamId,
          type: 'BACKGROUND_MUSIC',
        },
        skip: randomIndex,
      })
    }

    // 3. Call cap_cut CLI
    const capcut = getCapcutProvider()
    const result = await capcut.clip({
      videoUrls: videos.map(v => v.url),
      musicUrl: music?.url,
    })

    if (!result.success || !result.clips) {
      return NextResponse.json({ error: result.error || 'Clip failed' }, { status: 500 })
    }

    // 4. Save results to VideoPush table
    const videoPushes = await Promise.all(
      result.clips.map(clip =>
        db.videoPush.create({
          data: {
            videoId: videos[0].id,  // Associate with first AI video
            productId,
            ipId: videos[0].ipId,
            templateId: clip.templateId,
            templateName: clip.template,
            musicId: music?.id,
            url: clip.url,
            thumbnail: clip.thumbnail,
            clipParams: JSON.stringify(clip.params),
            isQualified: true,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: `Created ${videoPushes.length} clips`,
      videos: videoPushes,
    })
  } catch (error) {
    console.error('Failed to clip:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
