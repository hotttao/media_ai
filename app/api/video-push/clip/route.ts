import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { getCapcutProvider } from '@/foundation/providers/CapcutCliProvider'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// 计算 videoIdHash
function computeVideoIdHash(videoIds: string[]): string {
  const sorted = [...videoIds].sort()
  const joined = sorted.join(',')
  return crypto.createHash('md5').update(joined).digest('hex')
}

// POST /api/video-push/clip
// 异步执行剪辑，CLI 完成后回调更新状态
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, ipId, sceneId, videoIds, musicId } = body

    if (!productId || !ipId || !sceneId || !videoIds || !Array.isArray(videoIds)) {
      return NextResponse.json({ error: 'productId, ipId, sceneId, videoIds[] are required' }, { status: 400 })
    }

    // 计算 videoIdHash
    const videoIdHash = computeVideoIdHash(videoIds)
    const videoIdStr = videoIds.join(',')

    // 查找 pending 记录
    const pendingRecords = await db.videoPush.findMany({
      where: {
        productId,
        ipId,
        sceneId,
        videoIdHash,
        status: 'pending',
      },
      take: 1, // 每次执行一个
    })

    if (pendingRecords.length === 0) {
      return NextResponse.json({
        message: 'No pending clips to process',
        pendingCount: 0,
      })
    }

    const record = pendingRecords[0]

    // 获取视频 URL
    const videos = await db.video.findMany({
      where: {
        id: { in: videoIds },
        teamId: session.user.teamId,
      },
      select: { id: true, url: true },
    })

    if (videos.length === 0) {
      return NextResponse.json({ error: 'No videos found' }, { status: 400 })
    }

    // 获取音乐 URL
    let musicUrl: string | undefined
    if (musicId) {
      const music = await db.material.findUnique({
        where: { id: musicId, teamId: session.user.teamId },
        select: { url: true },
      })
      musicUrl = music?.url
    }

    // 获取 base URL 用于回调
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
    const callbackUrl = `${baseUrl}/api/video-push/callback?videoPushId=${record.id}`

    // 获取 output 目录
    const teamId = session.user.teamId
    const today = new Date().toISOString().split('T')[0]
    const outputDir = path.join(process.cwd(), 'public', 'uploads', 'teams', teamId, 'clips', today)

    // 调用 CLI 异步执行
    const capcut = getCapcutProvider()
    capcut.clipAsync({
      videoUrls: videos.map(v => v.url),
      musicUrl,
      outputDir,
      callbackUrl,
      templateName: record.templateName || 'detail-focus',
    })

    console.log(`[clip] Started async clip for VideoPush ${record.id}`)

    return NextResponse.json({
      message: `Clip job started for VideoPush ${record.id}`,
      videoPushId: record.id,
      pendingCount: pendingRecords.length,
    })
  } catch (error) {
    console.error('[clip] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}