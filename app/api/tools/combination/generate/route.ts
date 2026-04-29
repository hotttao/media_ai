import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateModelImage, generateStyleImage, generateFirstFrame } from '@/domains/video-generation/service'
import { db } from '@/foundation/lib/db'

// POST /api/tools/combination/generate
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, ipId, productId, modelImageId, poseId, styleImageId, sceneId } = body

  try {
    let result

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

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}