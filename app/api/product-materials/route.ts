import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getProductMaterials } from '@/domains/product-material/service'

// GET /api/product-materials?productId={id}&ipId={ipId}
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const ipId = searchParams.get('ipId')

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
    }

    const materials = await getProductMaterials({
      productId,
      ipId: ipId || undefined,
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Get product materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
