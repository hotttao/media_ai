import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/products/:id/generated-materials/firstFrame/:materialId/alternatives-count
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await db.product.findFirst({
      where: {
        id: params.id,
        teamId: session.user.teamId || undefined,
      },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Verify the firstFrame exists and belongs to this product
    const firstFrame = await db.firstFrame.findFirst({
      where: {
        id: params.materialId,
        productId: params.id,
      },
      select: { id: true },
    })

    if (!firstFrame) {
      return NextResponse.json({ error: 'FirstFrame not found' }, { status: 404 })
    }

    const count = await db.alternativeImage.count({
      where: {
        materialType: 'FIRST_FRAME',
        relatedId: params.materialId,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Get alternatives count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}