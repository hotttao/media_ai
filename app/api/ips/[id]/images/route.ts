import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { uploadToImageService } from '@/foundation/lib/file-upload'
import { db } from '@/foundation/lib/db'

type RouteParams = { params: { id: string } }

// POST /api/ips/[id]/images - Upload images for an IP
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()

    const avatar = formData.get('avatar') as File | null
    const fullBody = formData.get('fullBody') as File | null
    const threeView = formData.get('threeView') as File | null
    const nineView = formData.get('nineView') as File | null

    console.log('[IP Images Upload] avatar:', avatar?.name, 'fullBody:', fullBody?.name, 'threeView:', threeView?.name, 'nineView:', nineView?.name)

    const teamId = session.user.teamId
    const userId = session.user.id!
    const ipId = params.id

    async function processFile(file: File | null): Promise<string | null> {
      if (!file) return null
      return uploadToImageService(file, teamId, userId, `ips/${ipId}`)
    }

    const [avatarUrl, fullBodyUrl, threeViewUrl, nineViewUrl] = await Promise.all([
      processFile(avatar),
      processFile(fullBody),
      processFile(threeView),
      processFile(nineView),
    ])

    // Update VirtualIp with all image URLs
    const updateData: {
      avatarUrl?: string | null
      fullBodyUrl?: string | null
      threeViewUrl?: string | null
      nineViewUrl?: string | null
    } = {}
    if (avatarUrl) updateData.avatarUrl = avatarUrl
    if (fullBodyUrl) updateData.fullBodyUrl = fullBodyUrl
    if (threeViewUrl) updateData.threeViewUrl = threeViewUrl
    if (nineViewUrl) updateData.nineViewUrl = nineViewUrl

    if (Object.keys(updateData).length > 0) {
      await db.virtualIp.update({
        where: { id: ipId },
        data: updateData,
      })
    }

    const updatedIp = await db.virtualIp.findUnique({ where: { id: ipId } })
    return NextResponse.json(updatedIp, { status: 200 })
  } catch (error) {
    console.error('Upload IP images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}