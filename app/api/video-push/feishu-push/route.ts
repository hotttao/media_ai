import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { sendVideoWithText, sendImageWithText } from '@/foundation/lib/feishu'
import { db } from '@/foundation/lib/db'

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

    // Download video and image from URLs
    const videoBuffer = await downloadToBuffer(videoUrl)
    const imageBuffer = thumbnail ? await downloadToBuffer(thumbnail) : null

    let success = false
    if (videoBuffer) {
      // Send video with text
      const fileName = `video_${videoPushId.slice(0, 8)}.mp4`
      success = await sendVideoWithText(
        videoBuffer,
        title || '视频推送',
        content || '',
        fileName
      )
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function downloadToBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('[feishu-push] Download error:', error)
    return null
  }
}
