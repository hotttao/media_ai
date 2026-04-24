import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { deleteProductImage } from '@/domains/product/service'

// DELETE /api/products/[id]/images/[imageId] - 删除副图
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteProductImage(params.imageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product image error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
