// app/api/tools/image-blend/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getJimengProvider } from '@/foundation/providers/JimengCliProvider'

// POST /api/tools/image-blend
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageA, imageB, prompt, options } = body

    if (!imageA || !imageB || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: imageA, imageB, prompt' },
        { status: 400 }
      )
    }

    const jimeng = getJimengProvider()

    const result = await jimeng.imageBlend(
      imageA,
      imageB,
      prompt,
      {
        duration: options?.duration || 5,
        ratio: options?.ratio || '9:16',
        modelVersion: options?.modelVersion || 'seedance2.0',
        videoResolution: options?.videoResolution || '720p',
      }
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      outputUrl: result.outputPath,
    })
  } catch (error) {
    console.error('[ImageBlend API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
