import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateVideoTitleContent } from '@/core/services/gen-video-title'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/video-push/ai-fill?productId=xxx
// 使用 AI 填充发布标题和内容
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  try {
    // Get product info
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { name: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get main product image
    const mainImage = await db.productImage.findFirst({
      where: { productId, isMain: true },
      select: { url: true }
    })

    // Fallback: get any product image
    const productImage = mainImage?.url || ''

    const result = await generateVideoTitleContent(product.name, productImage)

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI fill failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}