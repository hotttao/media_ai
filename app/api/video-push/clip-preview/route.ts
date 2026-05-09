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

// GET /api/video-push/clip-preview?productId=xxx&ipId=yyy&sceneId=zzz
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const ipId = searchParams.get('ipId')
    const sceneId = searchParams.get('sceneId')

    if (!productId || !ipId || !sceneId) {
      return NextResponse.json({ error: 'productId, ipId, sceneId are required' }, { status: 400 })
    }

    // 1. 查询该 product + ip + scene 下的所有视频
    const videos = await db.video.findMany({
      where: {
        productId,
        ipId,
        sceneId,
        teamId: session.user.teamId,
      },
      select: {
        id: true,
        url: true,
      },
    })

    if (videos.length === 0) {
      return NextResponse.json({
        groups: [],
        totalClippable: 0,
        error: 'No videos found'
      })
    }

    // 2. 获取已有的 VideoPush 记录，按 videoIdHash 分组统计
    const existingPushes = await db.videoPush.findMany({
      where: {
        productId,
        ipId,
        sceneId,
        status: { in: ['pending', 'completed'] },
      },
      select: {
        id: true,
        videoIdHash: true,
        status: true,
      },
    })

    // 按 videoIdHash 分组
    const hashGroups = new Map<string, { pending: number; completed: number }>()
    for (const push of existingPushes) {
      if (!hashGroups.has(push.videoIdHash)) {
        hashGroups.set(push.videoIdHash, { pending: 0, completed: 0 })
      }
      const group = hashGroups.get(push.videoIdHash)!
      if (push.status === 'pending') group.pending++
      else group.completed++
    }

    // 3. 获取背景音乐
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

    // 4. 先下载视频到本地，再调用 cap_cut CLI dry-run
    const teamId = session.user.teamId
    const capcut = getCapcutProvider()
    console.log(`[clip-preview] Step 1: download videos, teamId=${teamId}`)
    let videoPaths: string[] = []
    try {
      videoPaths = await Promise.all(
        videos.map((v) => capcut.downloadVideoToLocal(v.url, teamId))
      )
    } catch (err) {
      console.error('[clip-preview] Step 1 failed - downloadVideoToLocal:', err)
      throw err
    }
    console.log(`[clip-preview] Step 1 success: downloaded ${videoPaths.length} videos`)

    console.log(`[clip-preview] Step 2: CLI dry-run`)
    const dryRunResult = await capcut.clipDryRun({
      videoUrls: videoPaths,
      musicUrl,
    })

    const potentialClips = dryRunResult.count || 0
    const existingCount = existingPushes.length

    // 计算可剪辑数量 = potential - existing
    const clippableCount = Math.max(0, potentialClips - existingCount)

    // 计算 videoIdHash
    const videoIdHash = computeVideoIdHash(videos.map(v => v.id))
    const existingByHash = hashGroups.get(videoIdHash) || { pending: 0, completed: 0 }

    return NextResponse.json({
      groups: [{
        videoIdHash,
        videoIds: videos.map(v => v.id).join(','),
        potentialClips,
        existingPending: existingByHash.pending,
        existingCompleted: existingByHash.completed,
        clippable: Math.max(0, potentialClips - existingByHash.pending - existingByHash.completed),
      }],
      totalClippable: clippableCount,
      videoCount: videos.length,
      hasMusic: !!musicUrl,
    })
  } catch (error) {
    console.error('[clip-preview] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}