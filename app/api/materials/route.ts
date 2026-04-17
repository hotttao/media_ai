import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createMaterial, getMaterials } from '@/domains/materials/service'
import { createMaterialSchema } from '@/domains/materials/validators'
import { z } from 'zod'

// GET /api/materials - List materials
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as any
    const search = searchParams.get('search') || undefined

    const materials = await getMaterials(
      session.user.teamId || '',
      session.user.id,
      {
        type: type || undefined,
        search,
      }
    )

    return NextResponse.json(materials)
  } catch (error) {
    console.error('List materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/materials - Create a new material
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createMaterialSchema.parse(body)

    const material = await createMaterial(
      session.user.id,
      session.user.teamId,
      validated
    )

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Create material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}