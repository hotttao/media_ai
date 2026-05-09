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

    if (!productId || !ipId || videoIds === undefined || !Array.isArray(videoIds)) {
      return NextResponse.json({ error: 'productId, ipId, videoIds[] are required' }, { status: 400 })
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
    console.log(`[clip] Step 1: download videos, teamId=${teamId}, videoIds=`, videoIds)
    const videoPaths = await Promise.all(
      videos.map(async (v) => {
        console.log(`[clip] Downloading video ${v.id}, url=${v.url}`)
        const localPath = await capcut.downloadVideoToLocal(v.url, teamId)
        console.log(`[clip] Downloaded to ${localPath}`)
        return localPath
      })
    )
    console.log(`[clip] Step 1 success: videoPaths=`, videoPaths)

    // Step 2: CLI dry-run 获取 templates
    console.log(`[clip] Step 2: CLI dry-run`)
    const dryRunResult = await capcut.clipDryRun({
      videoUrls: videoPaths,
      outputDir: path.join(process.cwd(), 'tmp', 'capcut-dryrun'),
    })

    if (dryRunResult.error || dryRunResult.count === 0) {
      return NextResponse.json({
        message: 'No templates available for this video count',
        count: 0,
      })
    }
    console.log(`[clip] Step 2 success: ${dryRunResult.count} templates`)

    // Step 3: 查找已存在的 VideoPush 记录（prepare-clips 已创建）
    console.log(`[clip] Step 3: find existing VideoPush records, videoIdHash=${videoIdHash}`)
    const existingRecords = await db.videoPush.findMany({
      where: {
        productId,
        ipId,
        videoIdHash,
        status: 'pending',
      },
    })

    if (existingRecords.length === 0) {
      return NextResponse.json({
        message: 'No pending VideoPush records found. Call prepare-clips first.',
        count: 0,
      })
    }

    const templateToVpMap: Map<string, string> = new Map()
    const videoPushIds: string[] = []
    for (const record of existingRecords) {
      templateToVpMap.set(record.templateName, record.id)
      videoPushIds.push(record.id)
    }
    console.log(`[clip] Step 3 success: found ${videoPushIds.length} existing records`)

    // Step 4: 构建 mapping 并调用 CLI
    const mappingArg = Array.from(templateToVpMap.entries())
      .map(([tmpl, vpId]) => `${tmpl}:${vpId}`)
      .join(',')
    console.log(`[clip] Step 4: spawn clipAsync`)
    console.log(`[clip]   mapping: ${mappingArg}`)
    console.log(`[clip]   outputDir: ${outputDir}`)
    console.log(`[clip]   callback: ${callbackUrl}`)
    console.log(`[clip]   videoPaths: ${videoPaths.join(', ')}`)

    await capcut.clipAsync({
      videoUrls: videoPaths,
      musicUrl,
      outputDir,
      callbackUrl,
      mapping: mappingArg,
    })

    console.log(`[clip] Step 4 complete, returning response`)

    return NextResponse.json({
      message: `Clip job completed`,
      videoPushIds,
      pendingCount: videoPushIds.length,
    })
  } catch (err) {
    throw err
  }
}