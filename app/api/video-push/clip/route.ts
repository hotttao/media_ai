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
// 双阶段执行：dry-run → 创建 VideoPush 记录 → CLI 执行
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

    // 获取视频 URL
    const videos: { id: string; url: string }[] = await db.video.findMany({
      where: {
        id: { in: videoIds },
        teamId: session.user.teamId,
      },
      select: { id: true, url: true },
    }).then(results => results.filter(v => v.url !== null) as { id: string; url: string }[])

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
    const callbackUrl = `${baseUrl}/api/video-push/callback`

    // 获取 output 目录
    const teamId = session.user.teamId
    const today = new Date().toISOString().split('T')[0]
    const outputDir = path.join(process.cwd(), 'public', 'uploads', 'teams', teamId, 'clips', today)

    // Step 1: 下载视频到本地
    const capcut = getCapcutProvider()
    console.log(`[clip] Step 1: download videos, teamId=${teamId}`)
    let videoPaths: string[] = []
    try {
      videoPaths = await Promise.all(
        videos.map((v) => capcut.downloadVideoToLocal(v.url, teamId))
      )
    } catch (err) {
      console.error('[clip] Step 1 failed - downloadVideoToLocal:', err)
      throw err
    }
    console.log(`[clip] Step 1 success: downloaded ${videoPaths.length} videos`)

    // Step 2: CLI dry-run 获取 templates
    console.log(`[clip] Step 2: CLI dry-run`)
    let dryRunResult: { count: number; templates?: { name: string; videoCount: number }[]; error?: string }
    try {
      dryRunResult = await capcut.clipDryRun({
        videoUrls: videoPaths,
        outputDir: path.join(process.cwd(), 'tmp', 'capcut-dryrun'),
      })
    } catch (err) {
      console.error('[clip] Step 2 failed - clipDryRun:', err)
      throw err
    }

    if (dryRunResult.error || dryRunResult.count === 0) {
      return NextResponse.json({
        message: 'No templates available for this video count',
        count: 0,
      })
    }
    console.log(`[clip] Step 2 success: ${dryRunResult.count} templates`)

    // Step 3: 为每个 template 创建 VideoPush 记录
    console.log(`[clip] Step 3: create VideoPush records`)
    const templateToVpMap: Map<string, string> = new Map()  // templateName → videoPushId
    const videoPushIds: string[] = []

    for (const tmpl of dryRunResult.templates || []) {
      const record = await db.videoPush.create({
        data: {
          productId,
          ipId,
          sceneId,
          videoId: videoIdStr,
          videoIdHash,
          templateName: tmpl.name,
          status: 'pending',
        }
      })
      templateToVpMap.set(tmpl.name, record.id)
      videoPushIds.push(record.id)
    }
    console.log(`[clip] Step 3 success: created ${videoPushIds.length} VideoPush records`)

    // Step 4: 构建 mapping 并调用 CLI
    const mappingArg = Array.from(templateToVpMap.entries())
      .map(([tmpl, vpId]) => `${tmpl}:${vpId}`)
      .join(',')
    console.log(`[clip] Step 4: spawn clipAsync with mapping`)

    capcut.clipAsync({
      videoUrls: videoPaths,
      musicUrl,
      outputDir,
      callbackUrl,
      mapping: mappingArg,
    })

    console.log(`[clip] Started async clip job for ${videoPushIds.length} templates`)
    console.log(`[clip] Mapping: ${mappingArg}`)

    return NextResponse.json({
      message: `Clip job started`,
      videoPushIds,
      pendingCount: videoPushIds.length,
    })
  } catch (error) {
    console.error('[clip] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}