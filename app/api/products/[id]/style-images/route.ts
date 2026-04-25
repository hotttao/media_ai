import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/products/{id}/style-images
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
    const modelImageId = searchParams.get('modelImageId')

    const where: any = { productId: params.id }
    if (ipId) where.ipId = ipId
    if (modelImageId) where.modelImageId = modelImageId

    const styleImages = await db.styleImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(styleImages)
  } catch (error) {
    console.error('Get style images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
