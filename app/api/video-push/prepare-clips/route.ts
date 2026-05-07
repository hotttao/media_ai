import { NextRequest, NextResponse } from 'next/server'
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

// POST /api/video-push/prepare-clips
// 预创建 pending 记录，避免重复调用 CLI dry-run
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, ipId, sceneId, videoIds, templateName, musicId } = body

    if (!productId || !ipId || !sceneId || !videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'productId, ipId, sceneId, videoIds[] are required' }, { status: 400 })
    }

    // 计算 videoIdHash
    const videoIdHash = computeVideoIdHash(videoIds)
    const videoIdStr = videoIds.join(',')

    // 检查是否已存在相同来源的 pending/completed 记录
    const existing = await db.videoPush.findFirst({
      where: {
        productId,
        ipId,
        sceneId,
        videoIdHash,
        status: { in: ['pending', 'completed'] },
      },
    })

    if (existing) {
      return NextResponse.json({
        message: 'Clips already prepared',
        videoIdHash,
        existingCount: 1,
        pendingCount: existing.status === 'pending' ? 1 : 0,
      })
    }

    // 调用 CLI dry-run 获取 potential clips 数量
    const capcut = getCapcutProvider()

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

    // 获取音乐 URL（如果有）
    let musicUrl: string | undefined
    if (musicId) {
      const music = await db.material.findUnique({
        where: { id: musicId, teamId: session.user.teamId },
        select: { url: true },
      })
      musicUrl = music?.url
    }

    // dry-run 获取数量
    const dryRunResult = await capcut.clipDryRun({
      videoUrls: videos.map(v => v.url),
      musicUrl,
    })

    if (dryRunResult.error) {
      return NextResponse.json({ error: dryRunResult.error }, { status: 500 })
    }

    const potentialCount = dryRunResult.count

    // 批量创建 pending 记录
    const created = await db.videoPush.createMany({
      data: Array.from({ length: potentialCount }, () => ({
        videoId: videoIdStr,
        videoIdHash,
        productId,
        ipId,
        sceneId,
        templateName: templateName || null,
        musicId: musicId || null,
        status: 'pending',
        url: '',
      })),
    })

    return NextResponse.json({
      message: `Created ${created.count} pending clips`,
      videoIdHash,
      createdCount: created.count,
      potentialCount,
    })
  } catch (error) {
    console.error('[prepare-clips] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}