import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { extractMaterialInfo } from '@/core/services/material-extractor'
import { z } from 'zod'

const extractMaterialSchema = z.object({
  images: z.array(z.string()).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = extractMaterialSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { images } = parsed.data

    // 使用 MiniMax 模型进行图片分析
    const result = await extractMaterialInfo(images)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to extract material info' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Extract material info error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
