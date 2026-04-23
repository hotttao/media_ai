import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateStyleImage } from '@/domains/video-generation/service'

// POST /api/products/{id}/style-image
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
    const { modelImageId, pose, makeupUrl, accessoryUrl } = body

    if (!modelImageId || !pose) {
      return NextResponse.json({ error: 'Missing required fields: modelImageId, pose' }, { status: 400 })
    }

    const result = await generateStyleImage(
      modelImageId,
      pose,
      makeupUrl,
      accessoryUrl
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Style image generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
