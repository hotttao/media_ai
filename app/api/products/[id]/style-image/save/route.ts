import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import { buildGeneratedImagePrompt } from '@/domains/video-generation/image-prompt'

// Simple hash function for deduplication
function hashStrings(...inputs: (string | undefined | null)[]): string {
  const str = inputs.filter(Boolean).join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// POST /api/products/{id}/style-image/save - 保存定妆图到 StyleImage 表
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
    const { modelImageId, poseId, makeupId, accessoryId, imageUrl, prompt } = body
    const safePoseId = poseId || ''
    const safeMakeupId = makeupId || ''
    const safeAccessoryId = accessoryId || ''

    if (!modelImageId || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields: modelImageId, imageUrl' }, { status: 400 })
    }

    // 获取 modelImage 以获取 productId 和 ipId
    const modelImage = await db.modelImage.findUnique({
      where: { id: modelImageId },
    })
    if (!modelImage) {
      return NextResponse.json({ error: 'ModelImage not found' }, { status: 404 })
    }

    // 检查是否已存在相同 productId + ipId + poseId + makeupId + accessoryId 的记录
    const existing = await db.styleImage.findUnique({
      where: {
        uniq_style_images_dedup: {
          modelImageId,
          poseId: safePoseId,
          makeupId: safeMakeupId,
          accessoryId: safeAccessoryId,
        }
      }
    })
    if (existing) {
      return NextResponse.json({ styledImageUrl: existing.url, styleImageId: existing.id })
    }

    // 保存到 style_images 表
    const styleImage = await db.styleImage.create({
      data: {
        id: uuid(),
        productId: modelImage.productId,
        ipId: modelImage.ipId,
        modelImageId,
        url: imageUrl,
        prompt: buildGeneratedImagePrompt(typeof prompt === 'string' ? prompt : null),
        poseId: safePoseId,
        makeupId: safeMakeupId,
        accessoryId: safeAccessoryId,
        inputHash: hashStrings(safePoseId, safeMakeupId, safeAccessoryId),
      }
    })

    return NextResponse.json({ styledImageUrl: styleImage.url, styleImageId: styleImage.id })
  } catch (error) {
    console.error('Style image save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
