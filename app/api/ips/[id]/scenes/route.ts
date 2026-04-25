import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVirtualIpScenes, setVirtualIpScenes } from '@/domains/virtual-ip/service'
import { z } from 'zod'

type RouteParams = { params: { id: string } }

const updateScenesSchema = z.object({
  materialIds: z.array(z.string()),
})

// GET /api/ips/[id]/scenes - 获取IP已配置的场景
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const scenes = await getVirtualIpScenes(params.id)
    return NextResponse.json(scenes)
  } catch (error) {
    console.error('Get IP scenes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/ips/[id]/scenes - 更新IP的场景配置
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
    const validated = updateScenesSchema.parse(body)

    await setVirtualIpScenes(params.id, validated.materialIds)

    const scenes = await getVirtualIpScenes(params.id)
    return NextResponse.json(scenes)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Update IP scenes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
