import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { getCapcutProvider } from '@/foundation/providers/CapcutCliProvider'

export const dynamic = 'force-dynamic'

// GET /api/video-push/clip-preview?productId=xxx&ipId=yyy
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const ipId = searchParams.get('ipId')

    if (!productId || !ipId) {
      return NextResponse.json({ error: 'productId and ipId are required' }, { status: 400 })
    }

    // 1. Query all AI videos for this product+ip
    const videos = await db.video.findMany({
      where: {
        productId,
        ipId,
        teamId: session.user.teamId,
      },
      select: {
        id: true,
        url: true,
      },
    })

    if (videos.length === 0) {
      return NextResponse.json({
        clippableCount: 0,
        error: 'No AI videos found'
      })
    }

    // 2. Get available templates (randomly select one for dry run)
    const templates = await db.material.findMany({
      where: {
        teamId: session.user.teamId,
        type: 'CLIP_TEMPLATE',
      },
      select: {
        id: true,
        name: true,
      },
    })

    // 3. Get background music (randomly select one)
    const musicCount = await db.material.count({
      where: {
        teamId: session.user.teamId,
        type: 'BACKGROUND_MUSIC',
      },
    })

    let musicUrl: string | undefined
    if (musicCount > 0) {
      const randomIndex = Math.floor(Math.random() * musicCount)
      const music = await db.material.findFirst({
        where: {
          teamId: session.user.teamId,
          type: 'BACKGROUND_MUSIC',
        },
        skip: randomIndex,
      })
      musicUrl = music?.url
    }

    // 4. Call cap_cut CLI dry run to get potential clip count
    const capcut = getCapcutProvider()
    const dryRunResult = await capcut.clipDryRun({
      videoUrls: videos.map(v => v.url),
      musicUrl,
    })

    if (dryRunResult.error) {
      return NextResponse.json({
        clippableCount: 0,
        error: dryRunResult.error
      })
    }

    // 5. Get existing video push count (clips already created)
    const existingClipCount = await db.videoPush.count({
      where: {
        productId,
        ipId,
      },
    })

    // 6. Calculate clippable count
    const clippableCount = Math.max(0, dryRunResult.count - existingClipCount)

    return NextResponse.json({
      clippableCount,
      potentialClips: dryRunResult.count,
      existingClips: existingClipCount,
      videoCount: videos.length,
      templateCount: templates.length,
      hasMusic: !!musicUrl,
    })
  } catch (error) {
    console.error('Failed to get clip preview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
