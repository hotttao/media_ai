import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db } from '@/foundation/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nickname, inviteCode } = body

    // Validate input
    if (!email || !password || !inviteCode) {
      return NextResponse.json(
        { error: 'Email, password, and invite code are required' },
        { status: 400 }
      )
    }

    // Find and validate invite code
    const invite = await db.inviteCode.findUnique({
      where: { code: inviteCode },
      include: { team: true },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      )
    }

    if (invite.used) {
      return NextResponse.json(
        { error: 'Invite code has already been used' },
        { status: 400 }
      )
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Invite code has expired' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user and mark invite code as used
    const [user] = await db.$transaction([
      db.user.create({
        data: {
          id: uuid(),
          email,
          passwordHash,
          nickname: nickname || email.split('@')[0],
          teamId: invite.teamId,
          role: 'MEMBER',
        },
      }),
      db.inviteCode.update({
        where: { id: invite.id },
        data: { used: true, usedBy: email },
      }),
    ])

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        teamId: user.teamId,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
