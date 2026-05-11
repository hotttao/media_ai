import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const ipId = request.nextUrl.searchParams.get('ipId')
    const modelImageId = request.nextUrl.searchParams.get('modelImageId')

    if (!ipId) {
      return NextResponse.json({ error: 'ipId is required' }, { status: 400 })
    }

    const ip = await db.virtualIp.findFirst({
      where: {
        id: ipId,
        teamId: session.user.teamId,
      },
      select: { id: true },
    })

    if (!ip) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 })
    }

    const where: { ipId: string; modelImageId?: string } = { ipId }
    if (modelImageId) {
      where.modelImageId = modelImageId
    }

    const images = await db.styleImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(images)
  } catch (error) {
    console.error('Get style images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
