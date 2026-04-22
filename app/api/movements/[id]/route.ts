import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getMovementMaterialById, updateMovementMaterial, deleteMovementMaterial } from '@/domains/movement-material/service'

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
    const movement = await updateMovementMaterial(params.id, body)
    return NextResponse.json(movement)
  } catch (error) {
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
    console.error('Delete movement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}