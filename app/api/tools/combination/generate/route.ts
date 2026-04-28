import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateModelImage } from '@/domains/video-generation/service'
import { db } from '@/foundation/lib/db'

// POST /api/tools/combination/generate
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, ipId, productId, modelImageId, poseId, styleImageId, sceneId } = body

  try {
    let result

    switch (type) {
      case 'model-image': {
        if (!ipId || !productId) {
          return NextResponse.json({ error: 'Missing ipId or productId' }, { status: 400 })
        }
        const product = await db.product.findUnique({
          where: { id: productId },
          include: { images: { where: { isMain: true }, take: 1 } },
        })
        if (!product?.images[0]) {
          return NextResponse.json({ error: 'Product has no main image' }, { status: 400 })
        }
        result = await generateModelImage(
          productId,
          ipId,
          product.images[0].url,
          []
        )
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}