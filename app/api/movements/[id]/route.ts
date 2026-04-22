import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getMovementMaterialById, updateMovementMaterial, deleteMovementMaterial } from '@/domains/movement-material/service'
import { z } from 'zod'

const updateMovementMaterialSchema = z.object({
  url: z.string().optional(),
  content: z.string().min(1).optional(),
  clothing: z.string().optional(),
  scope: z.string().optional(),
})

type RouteParams = { params: { id: string } }

// GET /api/movements/[id]
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const movement = await getMovementMaterialById(params.id)
    if (!movement) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(movement)
  } catch (error) {
    console.error('Get movement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/movements/[id]
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateMovementMaterialSchema.parse(body)
    const movement = await updateMovementMaterial(params.id, validated)
    return NextResponse.json(movement)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Update movement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/movements/[id]
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteMovementMaterial(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Delete movement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}