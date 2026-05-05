import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// DELETE /api/alternative-images/:id
export async function DELETE(
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
      console.log('Alternative delete forbidden:', { teamId, sessionTeamId: session.user.teamId, materialType: alternative.materialType, relatedId: alternative.relatedId })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.alternativeImage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete alternative image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}