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

    // Get IP nickname
    const ip = await db.virtualIp.findUnique({
      where: { id: ipId },
      select: { nickname: true }
    })

    // Get all VideoPush records for this product+ip
    // These represent clips (either pending or completed from Capcut callback)
    const videoPushes = await db.videoPush.findMany({
      where: { productId, ipId },
      orderBy: { createdAt: 'desc' },
    })

    // Collect source video IDs from VideoPush records
    const sourceVideoIdsSet = new Set<string>()
    for (const vp of videoPushes) {
      if (vp.videoId) {
        vp.videoId.split(',').map(id => id.trim()).filter(Boolean).forEach(id => sourceVideoIdsSet.add(id))
      }
    }

    // Also get videos directly from Video table for this product+ip (AI generated videos)
    const aiVideos = await db.video.findMany({
      where: { productId, ipId: ipId || undefined },
      select: { id: true, url: true, thumbnail: true, createdAt: true },
    })
    for (const v of aiVideos) {
      sourceVideoIdsSet.add(v.id)
    }
    const sourceVideoIds = Array.from(sourceVideoIdsSet)

    // Get source video details
    const sourceVideos = await db.video.findMany({
      where: { id: { in: sourceVideoIds } },
      select: { id: true, url: true, thumbnail: true, createdAt: true, sceneId: true },
    })
    const videoMap = new Map(sourceVideos.map(v => [v.id, v]))

    // Build clips from VideoPush records
    // Each VideoPush = one clip that may be ready to publish
    const clips = videoPushes.map(vp => {
      // Determine the display video (prefer clip output URL, fallback to source)
      const clipUrl = vp.url || ''
      const clipThumbnail = vp.thumbnail || ''

      // If we have clip output, use it; otherwise show source video info
      const sourceIds = vp.videoId ? vp.videoId.split(',').map(id => id.trim()).filter(Boolean) : []
      const primarySourceId = sourceIds[0] || ''
      const primarySource = videoMap.get(primarySourceId)

      return {
        id: vp.id,
        videoPushId: vp.id,
        sourceVideoId: primarySourceId,
        // For pending clips without output, show source video
        // For completed clips, show clip output
        url: clipUrl || primarySource?.url || '',
        thumbnail: clipThumbnail || primarySource?.thumbnail || null,
        createdAt: vp.createdAt.toISOString(),
        status: vp.isPublished ? 'published' : (vp.status === 'completed' ? 'ready' : 'pending'),
        isQualified: vp.isQualified,
        isPublished: vp.isPublished,
        videoIds: sourceIds,
      }
    })

    // selectedVideos: clips that are qualified and not published
    const selectedVideoIds = clips
      .filter(c => c.isQualified && !c.isPublished)
      .map(c => c.videoPushId)

    // Unqualified source video IDs to filter out
    const unqualifiedVideoPushes = await db.videoPush.findMany({
      where: { productId, ipId, isQualified: false },
      select: { videoId: true }
    })
    const unqualifiedSourceIds = new Set<string>()
    for (const vp of unqualifiedVideoPushes) {
      if (vp.videoId) {
        vp.videoId.split(',').map(id => id.trim()).filter(Boolean).forEach(id => unqualifiedSourceIds.add(id))
      }
    }

    // videos: source videos filtered by unqualified, with sceneId
    const videosList = sourceVideos
      .filter(v => !unqualifiedSourceIds.has(v.id))
      .map(v => ({
        id: v.id,
        url: v.url,
        thumbnail: v.thumbnail,
        createdAt: v.createdAt.toISOString(),
        sceneId: v.sceneId || null,
      }))

    // Resolve scene IDs to scene info (name, thumbnail)
    const uniqueSceneIds = [...new Set(sourceVideos.map(v => v.sceneId).filter(Boolean))] as string[]
    const scenes = uniqueSceneIds.length > 0 ? await db.material.findMany({
      where: { id: { in: uniqueSceneIds } },
      select: { id: true, name: true, url: true },
    }) : []
    const sceneMap = new Map(scenes.map(s => [s.id, { id: s.id, name: s.name, thumbnail: s.url }]))

    return NextResponse.json({
      productId,
      ipId,
      ipNickname: ip?.nickname || '',
      productName: product.name,
      selectedVideos: selectedVideoIds,
      videos: videosList,
      clips,
      scenes: scenes.map(s => ({ id: s.id, name: s.name, thumbnail: s.url })),
    })
  } catch (error) {
    console.error('Failed to fetch IP detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
