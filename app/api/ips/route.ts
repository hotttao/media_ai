import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createVirtualIp, getVirtualIps } from '@/domains/virtual-ip/service'
import { createIpSchema } from '@/domains/virtual-ip/validators'
import { z } from 'zod'

// GET /api/ips - List all IPs for the team
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const ips = await getVirtualIps(session.user.teamId)
    return NextResponse.json(ips)
  } catch (error) {
    console.error('List IPs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ips - Create a new IP
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const body = await request.json()
    const validated = createIpSchema.parse(body)

    const ip = await createVirtualIp(session.user.id, session.user.teamId, validated)
    return NextResponse.json(ip, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Create IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}