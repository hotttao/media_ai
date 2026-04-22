import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createMovementMaterial, getMovementMaterials } from '@/domains/movement-material/service'
import { z } from 'zod'

const createMovementMaterialSchema = z.object({
  url: z.string().optional(),
  content: z.string().min(1),
  clothing: z.string().optional(),
  scope: z.string().optional(),
})

// GET /api/movement-materials - List all movement materials
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const movements = await getMovementMaterials()
    return NextResponse.json(movements)
  } catch (error) {
    console.error('List movement materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/movement-materials - Create a new movement material
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createMovementMaterialSchema.parse(body)

    const movement = await createMovementMaterial(validated)

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Create movement material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
