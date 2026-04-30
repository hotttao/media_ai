import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

// GET /api/tools/combination/jimeng-images
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 获取用户的所有 IP
    const ips = await db.virtualIp.findMany({
      where: { userId },
      select: { id: true, nickname: true, fullBodyUrl: true },
    })

    // 获取用户的所有产品
    const products = await db.product.findMany({
      where: { userId },
      select: { id: true, name: true, images: { where: { isMain: true }, take: 1 } },
    })

    // 获取已生成的模特图（ModelImage）
    const modelImages = await db.modelImage.findMany({
      where: {
        ipId: { in: ips.map(ip => ip.id) },
        productId: { in: products.map(p => p.id) },
      },
      select: { id: true, ipId: true, productId: true, url: true },
    })

    // 建立 ipId-productId → modelImageId 的映射
    const modelImageMap = new Map<string, { id: string; url: string }>()
    for (const mi of modelImages) {
      const key = `${mi.ipId}-${mi.productId}`
      modelImageMap.set(key, { id: mi.id, url: mi.url })
    }

    // 获取姿势素材（type: POSE）
    const poses = await db.material.findMany({
      where: {
        type: 'POSE',
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
      select: { id: true, name: true, prompt: true, url: true },
    })

    // 获取场景素材（type: SCENE）
    const scenes = await db.material.findMany({
      where: {
        type: 'SCENE',
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
      select: { id: true, name: true, url: true },
    })

    // 获取已生成的首帧图（用于判断是否已生成过首帧图）
    const firstFrames = await db.firstFrame.findMany({
      where: {
        ipId: { in: ips.map(ip => ip.id) },
        productId: { in: products.map(p => p.id) },
      },
      select: { id: true, ipId: true, productId: true, sceneId: true },
    })

    // 建立 ipId-productId-sceneId → firstFrameId 的映射
    const firstFrameMap = new Map<string, string>()
    for (const ff of firstFrames) {
      const key = `${ff.ipId}-${ff.productId}-${ff.sceneId}`
      firstFrameMap.set(key, ff.id)
    }

    // 构建所有有效组合（必须有 modelImageId）
    interface JimengCombination {
      id: string
      ip: { id: string; nickname: string; fullBodyUrl: string | null }
      product: { id: string; name: string; mainImageUrl: string | null }
      modelImageId: string
      modelImageUrl: string
      pose: { id: string; name: string; prompt: string | null; url: string }
      scene: { id: string; name: string; url: string | null }
      existingFirstFrameId: string | null
    }

    const combinations: JimengCombination[] = []

    for (const ip of ips) {
      for (const product of products) {
        const miKey = `${ip.id}-${product.id}`
        const modelImage = modelImageMap.get(miKey)

        // 跳过没有 modelImage 的组合
        if (!modelImage) continue

        for (const pose of poses) {
          for (const scene of scenes) {
            const ffKey = `${ip.id}-${product.id}-${scene.id}`
            const existingFirstFrameId = firstFrameMap.get(ffKey) || null

            combinations.push({
              id: `${miKey}-${pose.id}-${scene.id}`,
              ip: {
                id: ip.id,
                nickname: ip.nickname,
                fullBodyUrl: ip.fullBodyUrl,
              },
              product: {
                id: product.id,
                name: product.name,
                mainImageUrl: product.images[0]?.url || null,
              },
              modelImageId: modelImage.id,
              modelImageUrl: modelImage.url,
              pose: {
                id: pose.id,
                name: pose.name,
                prompt: pose.prompt,
                url: pose.url,
              },
              scene: {
                id: scene.id,
                name: scene.name,
                url: scene.url,
              },
              existingFirstFrameId,
            })
          }
        }
      }
    }

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
