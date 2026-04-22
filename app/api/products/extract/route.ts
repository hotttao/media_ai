import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { extractProductInfoSchema } from '@/domains/product/validators'
import { extractProductInfo } from '@/core/services/product-extractor'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = extractProductInfoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { images } = parsed.data

    // 使用 MiniMax 模型进行图片分析
    const result = await extractProductInfo(images)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to extract product info' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Extract product info error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}