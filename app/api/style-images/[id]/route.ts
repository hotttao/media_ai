import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const { id } = await params

    const image = await db.styleImage.findUnique({
      where: { id },
      select: { id: true, productId: true, ipId: true, url: true },
    })

    if (!image) {
      return NextResponse.json({ error: 'Style image not found' }, { status: 404 })
    }

    // 验证权限：检查 product 是否属于当前用户的 team
    const product = await db.product.findFirst({
      where: { id: image.productId, teamId: session.user.teamId },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Style image not found' }, { status: 404 })
    }

    return NextResponse.json(image)
  } catch (error) {
    console.error('Get style image error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}