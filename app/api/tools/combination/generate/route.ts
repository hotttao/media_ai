import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { generateModelImage, generateStyleImage } from '@/domains/video-generation/service'
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

        // 验证 product 属于当前用户
        const product = await db.product.findUnique({
          where: { id: productId },
          include: { images: { where: { isMain: true }, take: 1 } },
        })
        if (!product || product.userId !== session.user.id) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // 验证 ip 属于当前用户
        const ip = await db.virtualIp.findUnique({ where: { id: ipId } })
        if (!ip || ip.userId !== session.user.id) {
          return NextResponse.json({ error: 'IP not found' }, { status: 404 })
        }

        if (!product.images[0]) {
          return NextResponse.json({ error: 'Product has no main image' }, { status: 400 })
        }
        result = await generateModelImage(
          productId,
          ipId,
          product.images[0].url,
          []
        )
        break
      }

      case 'style-image': {
        if (!modelImageId || !poseId) {
          return NextResponse.json({ error: 'Missing modelImageId or poseId' }, { status: 400 })
        }

        // 获取 pose 的 URL（pose 是 material 表的记录）
        const poseMaterial = await db.material.findUnique({ where: { id: poseId } })
        if (!poseMaterial) {
          return NextResponse.json({ error: 'Pose not found' }, { status: 404 })
        }

        // 验证权限：pose 必须是公开的或属于当前用户
        if (poseMaterial.visibility !== 'PUBLIC' && poseMaterial.userId !== session.user.id) {
          return NextResponse.json({ error: 'Pose not found' }, { status: 404 })
        }

        result = await generateStyleImage(modelImageId, poseMaterial.url || poseMaterial.name)
        break
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