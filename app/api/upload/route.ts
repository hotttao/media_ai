import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { uploadToImageService } from '@/foundation/lib/file-upload'

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
    const userId = session.user.id
    console.log('[upload API] 开始上传, fileName:', file.name, 'teamId:', teamId, 'subDir:', subDir)
    const url = await uploadToImageService(file, teamId, userId, subDir)
    console.log('[upload API] 上传完成, 返回url:', url)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[upload API] 上传错误:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}