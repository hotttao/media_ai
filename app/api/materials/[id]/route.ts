import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getMaterialById, deleteMaterial, updateMaterial } from '@/domains/materials/service'
import { updateMaterialSchema } from '@/domains/materials/validators'
import { z } from 'zod'

type RouteParams = { params: { id: string } }

// GET /api/materials/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const material = await getMaterialById(params.id)
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    return NextResponse.json(material)
  } catch (error) {
    console.error('Get material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/materials/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await deleteMaterial(
      params.id,
      session.user.id,
      session.user.teamId || ''
    )

    if (result.count === 0) {
      return NextResponse.json({ error: 'Material not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/materials/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateMaterialSchema.parse(body)
    const material = await updateMaterial(
      params.id,
      session.user.id,
      session.user.teamId || '',
      validated
    )

    if (!material) {
      return NextResponse.json({ error: 'Material not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json(material)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Update material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
