import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider } from '@/domains/combination'
import { CombinationType } from '@/domains/combination/types'
import { adaptModelImageCombinations } from '@/domains/combination/adapters'

// GET /api/tools/combination/model-images
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const teamId = session.user.teamId

    // 获取团队的所有 IP
    const ips = await db.virtualIp.findMany({
      where: { teamId },
      select: { id: true, nickname: true, fullBodyUrl: true },
    })

    // 获取团队的所有产品
    const products = await db.product.findMany({
      where: { teamId },
      select: { id: true, name: true, images: { where: { isMain: true }, take: 1 } },
    })

    // Initialize Engine
    const engine = new CombinationEngine(new ConstraintRegistry(), new PrismaMaterialPoolProvider(db))

    // For each (ip, product) pair, compute combinations
    const allCombinations = []
    for (const ip of ips) {
      for (const product of products) {
        const result = await engine.compute(product.id, ip.id, { type: CombinationType.MODEL_IMAGE })
        allCombinations.push(...result.combinations)
      }
    }

    // Adapt combinations to API format
    const adaptedCombinations = await adaptModelImageCombinations(allCombinations, teamId)

    return NextResponse.json(adaptedCombinations)
  } catch (error) {
    console.error('Error in model-images API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
