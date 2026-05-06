import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/products/{id}/first-frames
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
    const styleImageId = searchParams.get('styleImageId')

    const where: any = { productId: params.id }
    if (ipId) where.ipId = ipId
    if (styleImageId) where.styleImageId = styleImageId

    const firstFrames = await db.firstFrame.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        styleImage: {
          select: { poseId: true },
        },
      },
    })

    return NextResponse.json(firstFrames)
  } catch (error) {
    console.error('Get first frames error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
