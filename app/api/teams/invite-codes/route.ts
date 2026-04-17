import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { db } from '@/foundation/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'

// Generate a random 8-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// POST - Create a new invite code (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create invite codes' }, { status: 403 })
    }

    const body = await request.json()
    const { teamId } = body

    if (!teamId || !session.user.teamId || teamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
    }

    // Create invite code, valid for 7 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const inviteCode = await db.inviteCode.create({
      data: {
        id: uuid(),
        teamId,
        code: generateInviteCode(),
        expiresAt,
      },
      include: {
        team: true,
      },
    })

    return NextResponse.json({
      id: inviteCode.id,
      code: inviteCode.code,
      teamName: inviteCode.team.name,
      expiresAt: inviteCode.expiresAt,
    })
  } catch (error) {
    console.error('Create invite code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List invite codes for a team (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can view invite codes' }, { status: 403 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const inviteCodes = await db.inviteCode.findMany({
      where: { teamId: session.user.teamId },
      orderBy: { createdAt: 'desc' },
      include: { team: true },
    })

    return NextResponse.json(inviteCodes)
  } catch (error) {
    console.error('List invite codes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
