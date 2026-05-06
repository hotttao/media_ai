import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVideosByProduct, saveUploadedVideo, deleteVideo } from '@/domains/video/service'
import { db } from '@/foundation/lib/db'
import { uploadToImageService } from '@/foundation/lib/file-upload'

export const dynamic = 'force-dynamic'

// GET /api/products/[id]/videos
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const videos = await getVideosByProduct(params.id, session.user.teamId)

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Get product videos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/products/[id]/videos - 上传成品视频
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const firstFrameId = formData.get('firstFrameId') as string | undefined
    const movementId = formData.get('movementId') as string | undefined

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!firstFrameId || !movementId) {
      return NextResponse.json(
        { error: 'Missing required fields: firstFrameId, movementId' },
        { status: 400 }
      )
    }

    // Check if video with same firstFrameId + movementId already exists
    const existingVideo = await db.video.findFirst({
      where: {
        firstFrameId,
        movementId,
        teamId: session.user.teamId,
      },
      select: { id: true, url: true },
    })

    if (existingVideo) {
      return NextResponse.json({
        videoId: existingVideo.id,
        videoUrl: existingVideo.url,
        skipped: true,
      })
    }

    // 上传文件到远程存储
    const subDir = formData.get('subDir') as string || 'videos'
    const videoUrl = await uploadToImageService(file, session.user.teamId, session.user.id, subDir)

    // 从 firstFrameId 反推所有关联信息
    const firstFrame = await db.firstFrame.findUnique({
      where: { id: firstFrameId },
      include: {
        styleImage: { select: { modelImageId: true } },
      },
    })

    if (!firstFrame) {
      return NextResponse.json({ error: 'FirstFrame not found' }, { status: 404 })
    }

    const result = await saveUploadedVideo({
      productId: params.id,
      userId: session.user.id,
      teamId: session.user.teamId,
      ipId: firstFrame.ipId,
      movementId,
      url: videoUrl,
      sceneId: firstFrame.sceneId,
      poseId: undefined,
      firstFrameId: firstFrame.id,
      styleImageId: firstFrame.styleImageId,
      modelImageId: firstFrame.styleImage?.modelImageId ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Upload video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/products/[id]/videos - 删除视频
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json({ error: 'Missing required parameter: videoId' }, { status: 400 })
    }

    try {
      await deleteVideo(videoId, session.user.teamId)
      return NextResponse.json({ success: true })
    } catch (error) {
      if (error instanceof Error && error.message === 'Video not found') {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 })
      }
      throw error
    }
  } catch (error) {
    console.error('Delete video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
