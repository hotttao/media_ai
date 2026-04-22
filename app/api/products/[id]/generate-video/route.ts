import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateEffectImage, generateFirstFrame, generateVideo } from '@/domains/video-generation/service'

// GET /api/products/[id]/generate-video?step=effect-image|first-frame&...
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const step = searchParams.get('step')

    if (step === 'effect-image') {
      const ipId = searchParams.get('ipId')
      const sceneId = searchParams.get('sceneId')
      const poseId = searchParams.get('poseId') || undefined
      const makeupId = searchParams.get('makeupId') || undefined

      if (!ipId || !sceneId) {
        return NextResponse.json({ error: 'Missing required params: ipId, sceneId' }, { status: 400 })
      }

      const result = await generateEffectImage(params.id, ipId, sceneId, poseId, makeupId)
      return NextResponse.json(result)
    }

    if (step === 'first-frame') {
      const productMaterialId = searchParams.get('productMaterialId')
      const compositionId = searchParams.get('compositionId')

      if (!productMaterialId || !compositionId) {
        return NextResponse.json({ error: 'Missing required params: productMaterialId, compositionId' }, { status: 400 })
      }

      const result = await generateFirstFrame(productMaterialId, compositionId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  } catch (error) {
    console.error('Generate video step error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const body = await request.json()
    const { ipId, firstFrameUrl, movementId, productMaterialId } = body

    if (!ipId || !firstFrameUrl || !movementId) {
      return NextResponse.json({ error: 'Missing required fields: ipId, firstFrameUrl, movementId' }, { status: 400 })
    }

    const result = await generateVideo(
      params.id,
      session.user.id,
      session.user.teamId,
      ipId,
      firstFrameUrl,
      movementId,
      productMaterialId
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generate video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}