import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/daily-publish-plan/ip-products?ipId=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ipId = searchParams.get('ipId')

  if (!ipId) {
    return NextResponse.json({ error: 'ipId is required' }, { status: 400 })
  }

  try {
    // Get IP nickname
    const ip = await db.virtualIp.findUnique({
      where: { id: ipId },
      select: { nickname: true }
    })

    // Get all VideoPush records for this IP
    const videoPushes = await db.videoPush.findMany({
      where: { ipId },
      include: {
        product: {
          include: {
            images: { where: { isMain: true }, take: 1 },
          },
        },
      },
    })

    // Build products array with selected video info
    const products = videoPushes.map(vp => {
      // Parse selected video IDs from videoId field
      const selectedVideoIds = vp.videoId
        ? vp.videoId.split(',').map(id => id.trim()).filter(Boolean)
        : []

      // Get video count for this product+ip
      const videoCount = selectedVideoIds.length

      return {
        productId: vp.productId,
        productName: vp.product.name,
        productImage: vp.product.images[0]?.url || '',
        selectedVideoIds,
        videoCount,
        status: vp.status,
        isPublished: vp.isPublished,
        isQualified: vp.isQualified,
      }
    })

    return NextResponse.json({
      ipId,
      ipNickname: ip?.nickname || '',
      products,
    })
  } catch (error) {
    console.error('Failed to fetch IP products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
