import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db } from '@/foundation/lib/db'

// Generate a random 8-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nickname, inviteCode, teamName } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: '密码至少8个字符' },
        { status: 400 }
      )
    }

    let teamId: string | null = null
    let isFirstUser = false

    // If invite code provided, use it to join team
    if (inviteCode) {
      const invite = await db.inviteCode.findUnique({
        where: { code: inviteCode },
        include: { team: true },
      })

      if (!invite) {
        return NextResponse.json(
          { error: '邀请码无效' },
          { status: 400 }
        )
      }

      if (invite.used) {
        return NextResponse.json(
          { error: '邀请码已被使用' },
          { status: 400 }
        )
      }

      if (new Date(invite.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: '邀请码已过期' },
          { status: 400 }
        )
      }

      teamId = invite.teamId
    } else {
      // No invite code - create new team or join existing first team
      const existingTeams = await db.team.findMany()

      if (existingTeams.length === 0) {
        // No teams exist - this is the first user, create their team
        isFirstUser = true
        const newTeam = await db.team.create({
          data: {
            id: uuid(),
            name: teamName || `${nickname || email.split('@')[0]}的团队`,
          },
        })
        teamId = newTeam.id
      } else {
        return NextResponse.json(
          { error: '请提供邀请码加入团队，或联系管理员获取邀请码' },
          { status: 400 }
        )
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已注册' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user and mark invite code as used (if used)
    const userData = {
      id: uuid(),
      email,
      passwordHash,
      nickname: nickname || email.split('@')[0],
      teamId: teamId!,
      role: isFirstUser ? 'ADMIN' as const : 'MEMBER' as const,
    }

    const [user] = await db.$transaction([
      db.user.create({ data: userData }),
      ...(inviteCode ? [
        db.inviteCode.update({
          where: { code: inviteCode },
          data: { used: true, usedBy: email },
        })
      ] : [])
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
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
