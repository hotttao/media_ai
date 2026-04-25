import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

type MaterialType = 'modelImage' | 'styleImage' | 'firstFrame'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; type: MaterialType; materialId: string } }
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

    if (params.type === 'modelImage') {
      await db.$transaction(async (tx) => {
        const styleImages = await tx.styleImage.findMany({
          where: {
            productId: params.id,
            modelImageId: params.materialId,
          },
          select: { id: true },
        })
        const styleImageIds = styleImages.map((image) => image.id)

        if (styleImageIds.length > 0) {
          await tx.firstFrame.deleteMany({
            where: {
              productId: params.id,
              styleImageId: { in: styleImageIds },
            },
          })
        }

        await tx.styleImage.deleteMany({
          where: {
            productId: params.id,
            modelImageId: params.materialId,
          },
        })

        await tx.modelImage.deleteMany({
          where: {
            id: params.materialId,
            productId: params.id,
          },
        })
      })

      return NextResponse.json({ success: true })
    }

    if (params.type === 'styleImage') {
      await db.$transaction(async (tx) => {
        await tx.firstFrame.deleteMany({
          where: {
            productId: params.id,
            styleImageId: params.materialId,
          },
        })

        await tx.styleImage.deleteMany({
          where: {
            id: params.materialId,
            productId: params.id,
          },
        })
      })

      return NextResponse.json({ success: true })
    }

    if (params.type === 'firstFrame') {
      await db.firstFrame.deleteMany({
        where: {
          id: params.materialId,
          productId: params.id,
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid generated material type' }, { status: 400 })
  } catch (error) {
    console.error('Delete generated material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
