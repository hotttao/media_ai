import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider } from '@/domains/combination'
import { CombinationType } from '@/domains/combination/types'
import { adaptFirstFrameCombinations } from '@/domains/combination/adapters'

// GET /api/tools/combination/first-frames?productId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const teamId = session.user.teamId

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    // 获取团队 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true },
    })

    if (ips.length === 0) {
      return NextResponse.json([])
    }

    // 初始化引擎
    const engine = new CombinationEngine(
      new ConstraintRegistry(),
      new PrismaMaterialPoolProvider(db)
    )

    // 为每个 IP 计算组合
    const allCombinations = []
    for (const ip of ips) {
      const result = await engine.compute(productId || '', ip.id, {
        type: CombinationType.FIRST_FRAME
      })
      allCombinations.push(...result.combinations)
    }

    // 转换为 API 格式
    const combinations = await adaptFirstFrameCombinations(allCombinations)

    return NextResponse.json(combinations)
  } catch (error) {
    console.error('First frames computation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
