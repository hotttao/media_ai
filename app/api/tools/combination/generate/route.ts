import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateModelImage, generateStyleImage, generateFirstFrame } from '@/domains/video-generation/service'
import { db } from '@/foundation/lib/db'

// Simple hash function for generating deterministic IDs
function hashStrings(...inputs: (string | undefined | null)[]): string {
  const str = inputs.filter(Boolean).join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// POST /api/tools/combination/generate
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, ipId, productId, modelImageId, poseId, styleImageId, sceneId } = body

  try {
    switch (type) {
      case 'model-image': {
        if (!ipId || !productId) {
          return NextResponse.json({ error: 'Missing ipId or productId' }, { status: 400 })
        }

        // 调用外部 API 异步提交生成任务
        const submitUrl = 'http://127.0.0.1:8765/v1/single/model-image'
        const submitBody = { productId, ipId }
        console.log('\n========== MODEL-IMAGE REQUEST ==========')
        console.log('URL:', submitUrl)
        console.log('BODY:', JSON.stringify(submitBody, null, 2))
        console.log('==========================================\n')

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout

        let response
        try {
          response = await fetch(submitUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submitBody),
            signal: controller.signal,
          })
        } catch (err) {
          clearTimeout(timeoutId)
          console.error('>>> Model-image API call failed:', err)
          return NextResponse.json({ error: 'Failed to submit task: network error' }, { status: 500 })
        }

        clearTimeout(timeoutId)
        console.log('>>> Model-image API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('Model-image API returned error:', response.status, errorText)
          return NextResponse.json({ error: 'Failed to submit task' }, { status: 500 })
        }

        return NextResponse.json({ status: 'submitted' })
      }

      case 'style-image': {
        if (!modelImageId || !poseId) {
          return NextResponse.json({ error: 'Missing modelImageId or poseId' }, { status: 400 })
        }

        console.log('\n========== STYLE-IMAGE REQUEST ==========')
        console.log('URL: http://127.0.0.1:8765/v1/single/style-image')
        console.log('BODY:', JSON.stringify({ modelImageId, poseId }, null, 2))
        console.log('==========================================\n')

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000)

        let response
        try {
          response = await fetch('http://127.0.0.1:8765/v1/single/style-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelImageId, poseId }),
            signal: controller.signal,
          })
        } catch (err) {
          clearTimeout(timeoutId)
          console.error('>>> Style-image API call failed:', err)
          return NextResponse.json({ error: 'Failed to submit task: network error' }, { status: 500 })
        }

        clearTimeout(timeoutId)
        console.log('>>> Style-image API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('Style-image API returned error:', response.status, errorText)
          return NextResponse.json({ error: 'Failed to submit task' }, { status: 500 })
        }

        return NextResponse.json({ status: 'submitted' })
      }

      case 'first-frame': {
        if (!styleImageId || !sceneId) {
          return NextResponse.json({ error: 'Missing styleImageId or sceneId' }, { status: 400 })
        }

        console.log('\n========== FIRST-FRAME REQUEST ==========')
        console.log('URL: http://127.0.0.1:8765/v1/single/first-frame-image')
        console.log('BODY:', JSON.stringify({ styleImageId, sceneId }, null, 2))
        console.log('==========================================\n')

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000)

        let response
        try {
          response = await fetch('http://127.0.0.1:8765/v1/single/first-frame-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styleImageId, sceneId }),
            signal: controller.signal,
          })
        } catch (err) {
          clearTimeout(timeoutId)
          console.error('>>> First-frame API call failed:', err)
          return NextResponse.json({ error: 'Failed to submit task: network error' }, { status: 500 })
        }

        clearTimeout(timeoutId)
        console.log('>>> First-frame API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('First-frame API returned error:', response.status, errorText)
          return NextResponse.json({ error: 'Failed to submit task' }, { status: 500 })
        }

        return NextResponse.json({ status: 'submitted' })
      }

      case 'jimeng-image': {
        if (!modelImageId || !poseId || !sceneId) {
          return NextResponse.json({ error: 'Missing modelImageId, poseId, or sceneId' }, { status: 400 })
        }

        console.log('\n========== JIMENG-IMAGE REQUEST ==========')
        console.log('URL: http://127.0.0.1:8765/v1/single/jimeng-image')
        console.log('BODY:', JSON.stringify({ styleImageId, sceneId, poseId, force: false }, null, 2))
        console.log('==========================================\n')

        // 1. 查找 pose 的文字描述（从 Material 表）
        const pose = await db.material.findUnique({
          where: { id: poseId },
          select: { prompt: true },
        })
        const poseText = pose?.prompt || ''

        // 2. 生成虚假 styleImageId：jimeng_${hashStrings(modelImageId, poseId)}
        const inputHash = hashStrings(modelImageId, poseId)
        const styleImageId = `jimeng_${inputHash}`

        // 3. 检查 styleImage 是否已存在，不存在则创建虚假记录（url 为空字符串）
        const existingStyleImage = await db.styleImage.findUnique({
          where: { id: styleImageId },
        })

        if (!existingStyleImage) {
          // 获取 modelImage 以便复制 productId 和 ipId
          const modelImage = await db.modelImage.findUnique({
            where: { id: modelImageId },
            select: { productId: true, ipId: true },
          })

          await db.styleImage.create({
            data: {
              id: styleImageId,
              productId: modelImage?.productId || '',
              ipId: modelImage?.ipId || '',
              modelImageId,
              url: '',
              prompt: poseText,
              poseId,
              makeupId: '',
              accessoryId: '',
              inputHash,
            },
          })
        }

        // 4. 调用即梦接口
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000)

        let response
        try {
          response = await fetch('http://127.0.0.1:8765/v1/single/jimeng-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styleImageId, sceneId, poseId, force: false }),
            signal: controller.signal,
          })
        } catch (err) {
          clearTimeout(timeoutId)
          console.error('>>> Jimeng-image API call failed:', err)
          return NextResponse.json({ error: 'Failed to submit task: network error' }, { status: 500 })
        }

        clearTimeout(timeoutId)
        console.log('>>> Jimeng-image API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('Jimeng-image API returned error:', response.status, errorText)
          return NextResponse.json({ error: 'Failed to submit task' }, { status: 500 })
        }

        return NextResponse.json({ styleImageId, status: 'submitted' })
      }

      case 'jimeng-video': {
        const { firstFrameId, movementId } = body

        if (!firstFrameId || !movementId) {
          return NextResponse.json({ error: 'Missing firstFrameId or movementId' }, { status: 400 })
        }

        // 1. 获取首帧图信息（包含 productId, ipId）
        const firstFrame = await db.firstFrame.findUnique({
          where: { id: firstFrameId },
          select: { productId: true, ipId: true },
        })

        if (!firstFrame) {
          return NextResponse.json({ error: 'FirstFrame not found' }, { status: 404 })
        }

        // 2. 获取动作信息（获取 content 作为 prompt）
        const movement = await db.movementMaterial.findUnique({
          where: { id: movementId },
          select: { content: true },
        })

        const prompt = movement?.content || ''

        console.log('\n========== JIMENG-VIDEO REQUEST ==========')
        console.log('URL: http://127.0.0.1:8765/v1/single/jimeng-video')
        console.log('BODY:', JSON.stringify({
          productId: firstFrame.productId,
          ipId: firstFrame.ipId,
          firstFrameId,
          movementId,
          prompt,
          force: false,
        }, null, 2))
        console.log('==========================================\n')

        // 3. 调用即梦接口
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000)

        let response
        try {
          response = await fetch('http://127.0.0.1:8765/v1/single/jimeng-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: firstFrame.productId,
              ipId: firstFrame.ipId,
              firstFrameId,
              movementId,
              prompt,
              force: false,
            }),
            signal: controller.signal,
          })
        } catch (err) {
          clearTimeout(timeoutId)
          console.error('>>> Jimeng-video API call failed:', err)
          return NextResponse.json({ error: 'Failed to submit task: network error' }, { status: 500 })
        }

        clearTimeout(timeoutId)
        console.log('>>> Jimeng-video API response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('Jimeng-video API returned error:', response.status, errorText)
          return NextResponse.json({ error: 'Failed to submit task' }, { status: 500 })
        }

        return NextResponse.json({ status: 'submitted' })
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}