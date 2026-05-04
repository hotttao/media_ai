// app/api/alternative-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { db } from '@/foundation/lib/db'
import { AlternativeType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/alternative-images?materialType=FIRST_FRAME&relatedId=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.user.teamId) {
    return NextResponse.json({ error: 'User has no team' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const materialType = searchParams.get('materialType')
  const relatedId = searchParams.get('relatedId')

  if (!materialType || !relatedId) {
    return NextResponse.json(
      { error: 'materialType and relatedId are required' },
      { status: 400 }
    )
  }

  if (!Object.values(AlternativeType).includes(materialType as AlternativeType)) {
    return NextResponse.json(
      { error: 'Invalid materialType' },
      { status: 400 }
    )
  }

  // Authorization: Check resource exists (teamId not directly available on these models)
  let resourceExists = false

  if (materialType === 'FIRST_FRAME') {
    const resource = await db.firstFrame.findFirst({
      where: { id: relatedId },
    })
    resourceExists = !!resource
  } else if (materialType === 'MODEL_IMAGE') {
    const resource = await db.modelImage.findFirst({
      where: { id: relatedId },
    })
    resourceExists = !!resource
  } else if (materialType === 'STYLE_IMAGE') {
    const resource = await db.styleImage.findFirst({
      where: { id: relatedId },
    })
    resourceExists = !!resource
  }

  if (!resourceExists) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  }

  try {
    const alternatives = await db.alternativeImage.findMany({
      where: {
        materialType: materialType as AlternativeType,
        relatedId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ alternatives })
  } catch (error) {
    console.error('Failed to fetch alternative images:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/alternative-images
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.user.teamId) {
    return NextResponse.json({ error: 'User has no team' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { materialType, relatedId, url, source } = body

    if (!materialType || !relatedId || !url || !source) {
      return NextResponse.json(
        { error: 'materialType, relatedId, url, source are required' },
        { status: 400 }
      )
    }

    // Validate materialType against AlternativeType enum
    if (!Object.values(AlternativeType).includes(materialType)) {
      return NextResponse.json(
        { error: 'Invalid materialType' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Authorization: Check resource exists (teamId not directly available on these models)
    let resourceExists = false

    if (materialType === 'FIRST_FRAME') {
      const resource = await db.firstFrame.findFirst({
        where: { id: relatedId },
      })
      resourceExists = !!resource
    } else if (materialType === 'MODEL_IMAGE') {
      const resource = await db.modelImage.findFirst({
        where: { id: relatedId },
      })
      resourceExists = !!resource
    } else if (materialType === 'STYLE_IMAGE') {
      const resource = await db.styleImage.findFirst({
        where: { id: relatedId },
      })
      resourceExists = !!resource
    }

    if (!resourceExists) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    const alternative = await db.alternativeImage.create({
      data: {
        materialType,
        relatedId,
        url,
        source,
        isConfirmed: source === 'USER_UPLOADED', // Auto-confirm user uploaded images
      },
    })

    return NextResponse.json(alternative)
  } catch (error) {
    console.error('Failed to create alternative image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
