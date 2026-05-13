import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { exec } from 'child_process'
import path from 'path'

// POST /api/tools/open-folder
// 打开指定的本地目录（Windows Explorer）
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { filePath } = await request.json()

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 })
    }

    // 将 URL 路径转换为本地路径
    // filePath 格式: /uploads/teams/{teamId}/clips/xxx.mp4
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const localPath = path.join(process.cwd(), 'public', relativePath)
    const folderPath = path.dirname(localPath)

    console.log(`[open-folder] Opening folder: ${folderPath}`)

    // Windows: 使用 explorer 打开目录
    exec(`explorer "${folderPath}"`, (error) => {
      if (error) {
        console.error('[open-folder] Error:', error)
      }
    })

    return NextResponse.json({ success: true, folderPath })
  } catch (error) {
    console.error('[open-folder] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}