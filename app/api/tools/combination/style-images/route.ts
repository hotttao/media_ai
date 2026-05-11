import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider } from '@/domains/combination'
import { CombinationType } from '@/domains/combination/types'
import { adaptStyleImageCombinations } from '@/domains/combination/adapters'

// GET /api/tools/combination/style-images?productId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const teamId = session.user.teamId as string

    // 获取该产品的所有 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true }
    })

    if (ips.length === 0) {
      return NextResponse.json([])
    }

    // 初始化 Engine
    const registry = new ConstraintRegistry()
    const poolProvider = new PrismaMaterialPoolProvider(db)
    const engine = new CombinationEngine(registry, poolProvider)

    // 对每个 IP 计算 STYLE_IMAGE 组合
    const allCombinations: Awaited<ReturnType<typeof engine.compute>>['combinations'] = []

    for (const ip of ips) {
      const result = await engine.compute(productId || '', ip.id, {
        type: CombinationType.STYLE_IMAGE
      })
      allCombinations.push(...result.combinations)
    }

    // 转换格式
    const adaptedResults = await adaptStyleImageCombinations(allCombinations, productId || '')

    return NextResponse.json(adaptedResults)
  } catch (error) {
    console.error('Error in style-images API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
