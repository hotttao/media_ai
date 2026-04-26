import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { isSceneAllowedForProductAndIp } from '@/domains/product/service'
import { v4 as uuid } from 'uuid'
import { buildGeneratedImagePrompt } from '@/domains/video-generation/image-prompt'

// POST /api/products/{id}/first-frame
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
    const { styleImageId, sceneId, composition, imageUrl, prompt } = body

    if (!styleImageId || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields: styleImageId, imageUrl' }, { status: 400 })
    }

    // 获取 styleImage 以获取 productId 和 ipId
    const styleImage = await db.styleImage.findUnique({
      where: { id: styleImageId },
    })
    if (!styleImage) {
      return NextResponse.json({ error: 'StyleImage not found' }, { status: 404 })
    }

    if (sceneId) {
      const allowed = await isSceneAllowedForProductAndIp(params.id, styleImage.ipId, sceneId)
      if (!allowed) {
        return NextResponse.json({ error: 'Scene is not allowed for this product/IP combination' }, { status: 400 })
      }
    }

    const scenePrompt = sceneId
      ? (await db.material.findUnique({
          where: { id: sceneId },
          select: { prompt: true },
        }))?.prompt ?? null
      : null

    // 计算 input hash 用于去重
    const hashStrings = (...inputs: (string | undefined | null)[]): string => {
      const str = inputs.filter(Boolean).join('|')
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return Math.abs(hash).toString(36)
    }
    // sceneId 和 composition 用于去重，如果不存在则用空字符串代替
    const sceneForHash = sceneId || ''
    const compositionForHash = composition || ''
    const inputHash = hashStrings(sceneForHash, compositionForHash)

    // 检查是否已存在
    const existing = await db.firstFrame.findUnique({
      where: {
        uniq_first_frames_dedup: {
          productId: params.id,
          ipId: styleImage.ipId,
          sceneId: sceneForHash,
          inputHash
        }
      }
    })
    if (existing) {
      return NextResponse.json({ firstFrameUrl: existing.url, firstFrameId: existing.id })
    }

    // 保存到 first_frames 表
    const firstFrame = await db.firstFrame.create({
      data: {
        id: uuid(),
        productId: params.id,
        ipId: styleImage.ipId,
        styleImageId,
        url: imageUrl,
        prompt: buildGeneratedImagePrompt(
          typeof prompt === 'string' ? prompt : scenePrompt,
          composition
        ),
        sceneId: sceneId || undefined,
        composition: composition || undefined,
        inputHash,
      }
    })

    return NextResponse.json({ firstFrameUrl: firstFrame.url, firstFrameId: firstFrame.id })
  } catch (error) {
    console.error('First frame save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/products/{id}/first-frame
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const ipId = searchParams.get('ipId')

    const where: any = { productId: params.id }
    if (ipId) where.ipId = ipId

    const firstFrames = await db.firstFrame.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(firstFrames)
  } catch (error) {
    console.error('Get first frames error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
