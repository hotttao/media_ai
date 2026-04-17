import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { createOrUpdateIpImage } from '@/domains/virtual-ip/service'
import { ensureUploadDir, generateFileName, getPublicUrl } from '@/foundation/lib/file-upload'
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

    const teamId = session.user.teamId
    const ipId = params.id
    const subDir = path.join('ips', ipId)
    const uploadDir = ensureUploadDir(teamId)
    const targetDir = path.join(uploadDir, subDir)

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    async function processFile(file: File | null): Promise<string | null> {
      if (!file) return null
      const fileName = generateFileName(file.name)
      const filePath = path.join(targetDir, fileName)
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, buffer)
      return getPublicUrl(teamId, path.join(subDir, fileName))
    }

    const [avatarUrl, fullBodyUrl, threeViewUrl, nineViewUrl] = await Promise.all([
      processFile(avatar),
      processFile(fullBody),
      processFile(threeView),
      processFile(nineView),
    ])

    const image = await createOrUpdateIpImage(ipId, {
      avatarUrl: avatarUrl || undefined,
      fullBodyUrl: fullBodyUrl || undefined,
      threeViewUrl: threeViewUrl || undefined,
      nineViewUrl: nineViewUrl || undefined,
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error('Upload IP images error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}