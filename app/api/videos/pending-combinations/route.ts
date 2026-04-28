import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getPendingVideoCombinations } from '@/domains/video/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.user.teamId) {
    return NextResponse.json({ error: 'No team found' }, { status: 400 })
  }

  return NextResponse.json(await getPendingVideoCombinations(session.user.teamId))
}
