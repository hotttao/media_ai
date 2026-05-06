import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { uploadToImageService } from '@/foundation/lib/file-upload'
import { buildGeneratedImagePrompt } from '@/domains/video-generation/image-prompt'
import { v4 as uuid } from 'uuid'

// POST /api/products/{id}/first-frame-upload
// 上传多张首帧图并自动创建备选图记录
// - 接受多个图片文件，共享同样的 styleImageId, sceneId, composition, generationPath
// - 对每个图片：尝试创建首帧图（去重），然后创建备选图记录
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const styleImageId = formData.get('styleImageId') as string
    const sceneId = formData.get('sceneId') as string || ''
    const composition = formData.get('composition') as string || ''
    const prompt = formData.get('prompt') as string || ''
    const generationPath = formData.get('generationPath') as string
    const subDir = formData.get('subDir') as string || 'first-frames'

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (!styleImageId || !generationPath) {
      return NextResponse.json(
        { error: 'Missing required fields: styleImageId, generationPath' },
        { status: 400 }
      )
    }

    const teamId = session.user.teamId
    const userId = session.user.id
    const results: Array<{
      index: number
      firstFrameId: string
      firstFrameUrl: string
      alternativeId: string
      status: 'created' | 'existing'
    }> = []

    // 获取 styleImage 信息（只需一次）
    const styleImage = await db.styleImage.findUnique({
      where: { id: styleImageId },
    })
    if (!styleImage) {
      return NextResponse.json(
        { error: 'StyleImage not found' },
        { status: 404 }
      )
    }

    // 获取 scene prompt（只需一次）
    const scenePrompt = sceneId
      ? (await db.material.findUnique({
          where: { id: sceneId },
          select: { prompt: true },
        }))?.prompt ?? null
      : null

    // 计算 inputHash 用于去重（基于共享参数）
    const hashStrings = (...inputs: string[]): string => {
      const str = inputs.join('|')
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return Math.abs(hash).toString(36)
    }
    const inputHash = hashStrings(styleImageId, sceneId, composition)

    // 检查是否已存在首帧图（去重）- 只需检查一次
    let firstFrameId: string
    let firstFrameUrl: string
    let isNew = false

    const existing = await db.firstFrame.findUnique({
      where: {
        uniq_first_frames_dedup: {
          styleImageId,
          sceneId,
          composition,
          generationPath,
        }
      }
    })

    if (existing) {
      firstFrameId = existing.id
      firstFrameUrl = existing.url
    } else {
      // 创建首帧图记录
      const firstFrame = await db.firstFrame.create({
        data: {
          id: uuid(),
          productId: params.id,
          ipId: styleImage.ipId,
          styleImageId,
          url: '', // 先创建空 url，后续更新
          prompt: buildGeneratedImagePrompt(
            prompt || scenePrompt || undefined,
            composition
          ),
          sceneId,
          composition,
          inputHash,
          generationPath,
        }
      })
      firstFrameId = firstFrame.id
      firstFrameUrl = ''
      isNew = true
    }

    // 处理每个文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // 1. 上传图片
      const imageUrl = await uploadToImageService(file, teamId, userId, subDir)

      // 2. 如果是新创建的首帧图，更新其 url 为第一张图的地址
      if (isNew && i === 0) {
        await db.firstFrame.update({
          where: { id: firstFrameId },
          data: { url: imageUrl },
        })
        firstFrameUrl = imageUrl
      }

      // 3. 创建备选图记录（source=AI_GENERATED, isConfirmed=false）
      const alternative = await db.alternativeImage.create({
        data: {
          id: uuid(),
          materialType: 'FIRST_FRAME',
          relatedId: firstFrameId,
          url: imageUrl,
          source: 'AI_GENERATED',
          isConfirmed: false,
        }
      })

      results.push({
        index: i,
        firstFrameId,
        firstFrameUrl: i === 0 ? firstFrameUrl : imageUrl,
        alternativeId: alternative.id,
        status: isNew ? 'created' : 'existing',
      })
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    })
  } catch (error) {
    console.error('First frame upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}