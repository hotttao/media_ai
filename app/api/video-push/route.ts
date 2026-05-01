import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { getCapcutProvider } from '@/foundation/providers/CapcutCliProvider'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/video-push?productId=xxx&ipId=xxx&qualified=true
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const ipId = searchParams.get('ipId')
  const qualified = searchParams.get('qualified')

  try {
    const where: Prisma.VideoPushWhereInput = {
      product: { teamId: session.user.teamId },
    }
    if (productId) where.productId = productId
    if (ipId) where.ipId = ipId
    if (qualified === 'true') where.isQualified = true

    const videos = await db.videoPush.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true } },
        video: { select: { id: true, url: true, thumbnail: true } },
      },
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Failed to fetch video push:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

