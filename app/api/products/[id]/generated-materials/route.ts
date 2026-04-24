import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/products/{id}/generated-materials
// 获取产品所有生成的素材（ModelImage, StyleImage, FirstFrame）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const ipId = searchParams.get('ipId')
    const whereClause = searchParams.get('where')

    // Build where for model images
    const modelWhere: any = { productId: params.id }
    if (ipId) modelWhere.ipId = ipId

    const modelImages = await db.modelImage.findMany({
      where: modelWhere,
      orderBy: { createdAt: 'desc' },
    })

    // Get style images for these model images
    const modelImageIds = modelImages.map(m => m.id)
    const styleImages = modelImageIds.length > 0
      ? await db.styleImage.findMany({
          where: { modelImageId: { in: modelImageIds } },
          orderBy: { createdAt: 'desc' },
        })
      : []

    // Get first frames for these style images
    const styleImageIds = styleImages.map(s => s.id)
    const firstFrames = styleImageIds.length > 0
      ? await db.firstFrame.findMany({
          where: { styleImageId: { in: styleImageIds } },
          orderBy: { createdAt: 'desc' },
        })
      : []

    return NextResponse.json({
      modelImages,
      styleImages,
      firstFrames,
    })
  } catch (error) {
    console.error('Get generated materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
