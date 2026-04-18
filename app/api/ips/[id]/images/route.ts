import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { ensureUploadDir, generateFileName, getPublicUrl } from '@/foundation/lib/file-upload'
import { db } from '@/foundation/lib/db'
import fs from 'fs'
import path from 'path'

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
    const ipId = params.id
    const subDir = path.join('ips', ipId)
    const uploadDir = ensureUploadDir(teamId)
    const targetDir = path.join(uploadDir, subDir)

    console.log('[IP Images Upload] targetDir:', targetDir)

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
      console.log('[IP Images Upload] Created directory:', targetDir)
    }

    async function processFile(file: File | null): Promise<string | null> {
      if (!file) return null
      const fileName = generateFileName(file.name)
      const filePath = path.join(targetDir, fileName)
      console.log('[IP Images Upload] Writing file to:', filePath)
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, buffer)
      console.log('[IP Images Upload] File written, size:', buffer.length)
      return getPublicUrl(teamId, path.join(subDir, fileName))
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