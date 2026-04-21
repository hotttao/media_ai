import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { extractProductInfoSchema } from '@/domains/product/validators'
import { extractProductInfo } from '@/agent/services/product-extractor'

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

    // 使用 gemini 模型进行图片分析
    const result = await extractProductInfo(images, async (messages) => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages,
          max_tokens: 1000,
        }),
      })

      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    })

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