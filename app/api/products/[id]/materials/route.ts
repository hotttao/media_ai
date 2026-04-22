import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getProductMaterials } from '@/domains/product-material/service'

// GET /api/products/[id]/materials
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const materials = await getProductMaterials({ productId: params.id })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Get product materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}