import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getVideosByTeam } from '@/domains/video/service'

// GET /api/videos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const videos = await getVideosByTeam(session.user.teamId)

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Get videos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
