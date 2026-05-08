import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/daily-publish-plan/ip-detail?productId=xxx&ipId=yyy
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const ipId = searchParams.get('ipId')

  if (!productId || !ipId) {
    return NextResponse.json({ error: 'productId and ipId are required' }, { status: 400 })
  }

  try {
    // Get product name
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { name: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get all videos for this product+ip
    const videos = await db.video.findMany({
      where: { productId, ipId },
      select: {
        id: true,
        url: true,
        thumbnail: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get VideoPush records for this product+ip to determine selected videos
    // selectedVideos: isQualified=true && isPublished=false
    const videoPushes = await db.videoPush.findMany({
      where: { productId, ipId, isQualified: true, isPublished: false },
      select: { videoId: true }
    })

    // Get unqualified video IDs (isQualified=false) to filter out from results
    const unqualifiedVideoPushes = await db.videoPush.findMany({
      where: { productId, ipId, isQualified: false },
      select: { videoId: true }
    })
    const unqualifiedVideoIdsSet = new Set<string>()
    for (const vp of unqualifiedVideoPushes) {
      const ids = vp.videoId.split(',').map(id => id.trim()).filter(Boolean)
      ids.forEach(id => unqualifiedVideoIdsSet.add(id))
    }
    const unqualifiedVideoIds = Array.from(unqualifiedVideoIdsSet)

    // videoId is comma-separated string like "vid-1,vid-2,vid-3"
    // Extract all individual video IDs from selected VideoPushes
    const selectedVideoIdsSet = new Set<string>()
    for (const vp of videoPushes) {
      const ids = vp.videoId.split(',').map(id => id.trim()).filter(Boolean)
      ids.forEach(id => selectedVideoIdsSet.add(id))
    }
    const selectedVideoIds = Array.from(selectedVideoIdsSet)

    // videos array - all videos for this product+ip, excluding unqualified ones
    const videosList = videos
      .filter(v => !unqualifiedVideoIds.includes(v.id))
      .map(v => ({
        id: v.id,
        url: v.url,
        thumbnail: v.thumbnail,
        createdAt: v.createdAt.toISOString()
      }))

    // Get IP nickname
    const ip = await db.virtualIp.findUnique({
      where: { id: ipId },
      select: { nickname: true }
    })

    return NextResponse.json({
      productId,
      ipId,
      ipNickname: ip?.nickname || '',
      productName: product.name,
      selectedVideos: selectedVideoIds,
      videos: videosList
    })
  } catch (error) {
    console.error('Failed to fetch IP detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}