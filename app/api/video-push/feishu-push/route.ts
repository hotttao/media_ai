import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { sendVideoWithText, sendImageWithText } from '@/foundation/lib/feishu'
import { db } from '@/foundation/lib/db'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// POST /api/video-push/feishu-push
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { videoPushId, title, content, thumbnail, videoUrl } = body

    if (!videoPushId) {
      return NextResponse.json({ error: 'videoPushId is required' }, { status: 400 })
    }

    // Get videoPush record
    const videoPush = await db.videoPush.findUnique({
      where: { id: videoPushId },
    })

    if (!videoPush) {
      return NextResponse.json({ error: 'VideoPush not found' }, { status: 404 })
    }

    // Download video and image from URLs (优先从本地读取)
    const videoBuffer = await downloadToBuffer(videoUrl)
    const imageBuffer = thumbnail ? await downloadToBuffer(thumbnail) : null

    let success = false
    if (videoBuffer) {
      // Send video with text
      const fileName = `video_${videoPushId.slice(0, 8)}.mp4`
      console.log('[feishu-push] Sending video, size:', videoBuffer.length)
      success = await sendVideoWithText(
        videoBuffer,
        title || '视频推送',
        content || '',
        fileName
      )
      console.log('[feishu-push] sendVideoWithText result:', success)
    } else if (imageBuffer) {
      // Send image with text
      success = await sendImageWithText(
        imageBuffer,
        title || '图片推送',
        content || ''
      )
    } else {
      return NextResponse.json({ error: 'No video or image URL provided' }, { status: 400 })
    }

    if (success) {
      return NextResponse.json({ message: 'Push successful' })
    } else {
      return NextResponse.json({ error: 'Push failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('[feishu-push] Error:', error)
    if (error instanceof Error) {
      console.error('[feishu-push] Stack:', error.stack)
    }
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

// 本地 public 目录
const PUBLIC_DIR = path.join(process.cwd(), 'public')

async function downloadToBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null

  // 如果是完整URL，直接下载
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  // 相对路径：优先从本地读取
  const localPath = path.join(PUBLIC_DIR, url.replace(/^\//, ''))
  console.log('[feishu-push] Trying local path:', localPath)

  if (fs.existsSync(localPath)) {
    console.log('[feishu-push] Found local file, reading...')
    return fs.readFileSync(localPath)
  }

  // 本地不存在，从图片服务下载
  const IMAGE_SERVICE_BASE_URL = process.env.IMAGE_SERVICE_BASE_URL || 'http://192.168.2.38'
  const fullUrl = `${IMAGE_SERVICE_BASE_URL}${url}`
  console.log('[feishu-push] Local not found, downloading from:', fullUrl)

  const response = await fetch(fullUrl)
  if (!response.ok) {
    throw new Error(`Failed to download ${fullUrl}: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
