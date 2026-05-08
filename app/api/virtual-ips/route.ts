import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/virtual-ips - List all VirtualIPs for the team with id and nickname only
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const ips = await db.virtualIp.findMany({
      where: { teamId: session.user.teamId },
      select: { id: true, nickname: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(ips)
  } catch (error) {
    console.error('List VirtualIPs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
