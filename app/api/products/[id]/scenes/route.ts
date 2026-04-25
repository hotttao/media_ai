import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import {
  getProductScenes,
  getProductSummaryById,
  setProductScenes,
} from '@/domains/product/service'
import { z } from 'zod'

const updateScenesSchema = z.object({
  materialIds: z.array(z.string()),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const product = await getProductSummaryById(params.id, session.user.teamId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const scenes = await getProductScenes(params.id)
    return NextResponse.json(scenes)
  } catch (error) {
    console.error('Get product scenes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const product = await getProductSummaryById(params.id, session.user.teamId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateScenesSchema.parse(body)
    const uniqueMaterialIds = Array.from(new Set(validated.materialIds))

    const accessibleScenes = uniqueMaterialIds.length
      ? await db.material.findMany({
          where: {
            id: { in: uniqueMaterialIds },
            type: 'SCENE',
            OR: [
              { visibility: 'PUBLIC' },
              { visibility: 'TEAM', teamId: session.user.teamId },
              { visibility: 'PERSONAL', userId: session.user.id },
            ],
          },
          select: { id: true },
        })
      : []

    if (accessibleScenes.length !== uniqueMaterialIds.length) {
      return NextResponse.json({ error: 'Some scenes are not accessible' }, { status: 400 })
    }

    await setProductScenes(params.id, uniqueMaterialIds)

    const scenes = await getProductScenes(params.id)
    return NextResponse.json(scenes)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Update product scenes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
