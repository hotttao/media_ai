import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    // Verify product belongs to team
    const product = await db.product.findFirst({
      where: { id: params.id, teamId: session.user.teamId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete product material
    await db.productMaterial.delete({
      where: { id: params.materialId, productId: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
