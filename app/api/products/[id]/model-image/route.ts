import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateModelImage } from '@/domains/video-generation/service'

// POST /api/products/{id}/model-image
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ipId, productMainImageUrl, productDetailImageUrls } = body

    if (!ipId || !productMainImageUrl) {
      return NextResponse.json({ error: 'Missing required fields: ipId, productMainImageUrl' }, { status: 400 })
    }

    const result = await generateModelImage(
      params.id,
      ipId,
      productMainImageUrl,
      productDetailImageUrls || []
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Model image generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
