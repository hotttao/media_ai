import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'

// POST /api/products/{id}/model-image/save - 保存已上传的模特图到 ModelImage 表
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
    const { ipId, imageUrl, prompt } = body

    if (!ipId || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields: ipId, imageUrl' }, { status: 400 })
    }

    // 计算 input hash（上传的图片没有参数，所以用固定值）
    const inputHash = 'uploaded'

    // 检查是否已存在
    const existing = await db.modelImage.findFirst({
      where: {
        productId: params.id,
        ipId: ipId,
        url: imageUrl,
      }
    })
    if (existing) {
      return NextResponse.json({ modelImageUrl: existing.url, modelImageId: existing.id })
    }

    // 保存到 model_images 表
    const modelImage = await db.modelImage.create({
      data: {
        id: uuid(),
        productId: params.id,
        ipId: ipId,
        url: imageUrl,
        prompt: typeof prompt === 'string' ? prompt.trim() || null : null,
        inputHash,
      }
    })

    return NextResponse.json({ modelImageUrl: modelImage.url, modelImageId: modelImage.id })
  } catch (error) {
    console.error('Model image save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
