import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVirtualIpById, updateVirtualIp, deleteVirtualIp } from '@/domains/virtual-ip/service'
import { updateIpSchema } from '@/domains/virtual-ip/validators'
import { z } from 'zod'

type RouteParams = { params: { id: string } }

// GET /api/ips/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const ip = await getVirtualIpById(params.id, session.user.teamId)
    if (!ip) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 })
    }

    return NextResponse.json(ip)
  } catch (error) {
    console.error('Get IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/ips/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const body = await request.json()
    const validated = updateIpSchema.parse(body)

    const result = await updateVirtualIp(params.id, session.user.teamId, validated)
    if (result.count === 0) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 })
    }

    const updated = await getVirtualIpById(params.id, session.user.teamId)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Update IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/ips/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const result = await deleteVirtualIp(params.id, session.user.teamId)
    if (result.count === 0) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete IP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}