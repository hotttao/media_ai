import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getIpMaterials, createIpMaterial } from '@/domains/materials/service'
import { ensureUploadDir, generateFileName, getPublicUrl } from '@/foundation/lib/file-upload'
import fs from 'fs'
import path from 'path'

type RouteParams = { params: { ipId: string } }

// GET /api/materials/ip/[ipId] - Get IP-specific materials
// GET /api/materials/ip/[ipId]?type=MAKEUP - Filter by type
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING' | null

    const materials = await getIpMaterials(params.ipId, type || undefined)
    return NextResponse.json(materials)
  } catch (error) {
    console.error('Get IP materials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/materials/ip/[ipId] - Create IP-specific material with images
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !session.user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()

    const type = formData.get('type') as 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const tagsStr = formData.get('tags') as string | null
    const fullBody = formData.get('fullBody') as File | null
    const threeView = formData.get('threeView') as File | null
    const nineView = formData.get('nineView') as File | null
    const sourceIpMaterialId = formData.get('sourceIpMaterialId') as string | null
    const materialId = formData.get('materialId') as string | null

    const ipId = params.ipId
    const teamId = session.user.teamId
    const subDir = path.join('ip_materials', ipId)
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

    const [fullBodyUrl, threeViewUrl, nineViewUrl] = await Promise.all([
      processFile(fullBody),
      processFile(threeView),
      processFile(nineView),
    ])

    const tags = tagsStr ? JSON.parse(tagsStr) : undefined

    const material = await createIpMaterial(session.user.id, {
      ipId,
      type,
      name,
      description: description || undefined,
      tags,
      fullBodyUrl: fullBodyUrl || undefined,
      threeViewUrl: threeViewUrl || undefined,
      nineViewUrl: nineViewUrl || undefined,
      sourceIpMaterialId: sourceIpMaterialId || undefined,
      materialId: materialId || undefined,
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Create IP material error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}