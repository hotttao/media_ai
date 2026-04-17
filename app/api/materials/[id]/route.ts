import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getMaterialById, deleteMaterial } from '@/domains/materials/service'

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