// app/api/workflows/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getWorkflows } from '@/domains/workflow/service'

// GET /api/workflows - 列出可用工作流
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workflows = await getWorkflows()

    return NextResponse.json(workflows.map(w => ({
      id: w.id,
      code: w.code,
      name: w.name,
      description: w.description,
      version: w.version,
      nodeCount: w.nodes?.length || 0,
    })))
  } catch (error) {
    console.error('List workflows error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
