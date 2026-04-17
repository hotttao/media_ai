import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { ensureUploadDir, generateFileName, getPublicUrl } from '@/foundation/lib/file-upload'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const subDir = formData.get('subDir') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const teamId = session.user.teamId
    const uploadDir = ensureUploadDir(teamId)
    const targetDir = subDir ? path.join(uploadDir, subDir) : uploadDir

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const fileName = generateFileName(file.name)
    const filePath = path.join(targetDir, fileName)
    const publicUrl = getPublicUrl(teamId, subDir ? `${subDir}/${fileName}` : fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    return NextResponse.json({ url: publicUrl, fileName })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}