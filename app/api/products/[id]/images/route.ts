import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { addProductImage } from '@/domains/product/service'

// POST /api/products/[id]/images - 添加副图
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const image = await addProductImage(params.id, url)

    return NextResponse.json(image)
  } catch (error) {
    console.error('Add product image error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
