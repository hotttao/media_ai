import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateFirstFrame, generateVideo } from '@/domains/video-generation/service'

// POST /api/products/[id]/generate-video
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { ipId?: string; firstFrameUrl?: string; movementId?: string; productMaterialId?: string; step?: string; styleImageId?: string; sceneId?: string; composition?: string; imageUrl?: string }
    try {
      body = await request.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
      }
      throw error
    }

    const { step } = body

    // Handle step-based first-frame generation
    if (step === 'first-frame') {
      const { ipId, styleImageId, sceneId, composition, imageUrl } = body

      if (!ipId || !sceneId || !composition || !imageUrl) {
        return NextResponse.json({ error: 'Missing required params: ipId, sceneId, composition, imageUrl' }, { status: 400 })
      }

      const result = await generateFirstFrame(
        params.id,
        ipId,
        styleImageId || null,
        sceneId,
        composition,
        imageUrl
      )
      return NextResponse.json(result)
    }

    // Handle video generation
    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    if (!params.id || !/^[a-zA-Z0-9-_]+$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 })
    }

    const { ipId, firstFrameUrl, movementId } = body

    if (!ipId || !firstFrameUrl || !movementId) {
      return NextResponse.json({ error: 'Missing required fields: ipId, firstFrameUrl, movementId' }, { status: 400 })
    }

    const result = await generateVideo(
      params.id,
      session.user.id,
      session.user.teamId,
      ipId,
      firstFrameUrl,
      movementId
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}