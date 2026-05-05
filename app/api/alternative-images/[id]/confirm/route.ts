import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/alternative-images/:id/confirm
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(params.id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }

  try {
    const alternative = await db.alternativeImage.findUnique({
      where: { id: params.id },
    })

    if (!alternative) {
      return NextResponse.json({ error: 'Alternative not found' }, { status: 404 })
    }

    // Check ownership through related resource's teamId
    // All resources have productId -> Product -> teamId
    // Helper to get teamId from any resource that has productId
    const getProductTeamId = async (productId: string | null | undefined): Promise<string | null> => {
      if (!productId) return null
      const product = await db.product.findUnique({ where: { id: productId } })
      return product?.teamId ?? null
    }

    let teamId: string | null = null
    switch (alternative.materialType) {
      case 'FIRST_FRAME': {
        const ff = await db.firstFrame.findUnique({ where: { id: alternative.relatedId } })
        if (ff) teamId = await getProductTeamId(ff.productId)
        break
      }
      case 'MODEL_IMAGE': {
        const mi = await db.modelImage.findUnique({ where: { id: alternative.relatedId } })
        if (mi) teamId = await getProductTeamId(mi.productId)
        break
      }
      case 'STYLE_IMAGE': {
        const si = await db.styleImage.findUnique({ where: { id: alternative.relatedId } })
        if (si) teamId = await getProductTeamId(si.productId)
        break
      }
      case 'VIDEO': {
        const v = await db.video.findUnique({ where: { id: alternative.relatedId } })
        if (v) teamId = await getProductTeamId(v.productId)
        break
      }
    }

    if (!teamId || teamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // Update the formal record URL based on material type
      switch (alternative.materialType) {
        case 'FIRST_FRAME':
          await tx.firstFrame.update({
            where: { id: alternative.relatedId },
            data: { url: alternative.url },
          })
          break
        case 'MODEL_IMAGE':
          await tx.modelImage.update({
            where: { id: alternative.relatedId },
            data: { url: alternative.url },
          })
          break
        case 'STYLE_IMAGE':
          await tx.styleImage.update({
            where: { id: alternative.relatedId },
            data: { url: alternative.url },
          })
          break
        case 'VIDEO':
          await tx.video.update({
            where: { id: alternative.relatedId },
            data: { url: alternative.url },
          })
          break
        default:
          throw new Error(`Unknown material type: ${alternative.materialType}`)
      }

      // Mark this alternative as confirmed
      await tx.alternativeImage.update({
        where: { id: params.id },
        data: { isConfirmed: true },
      })
    })

    return NextResponse.json({
      success: true,
      confirmedUrl: alternative.url,
    })
  } catch (error) {
    console.error('Failed to confirm alternative image:', error)
    if (error instanceof Error && error.message.startsWith('Unknown material type:')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}