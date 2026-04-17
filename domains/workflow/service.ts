// domains/workflow/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { WorkflowDefinition } from './types'
import { LipstickPromoWorkflow } from './built-in/workflows/lipstick-promo'

// 内置工作流
const BUILT_IN_WORKFLOWS: WorkflowDefinition[] = [
  LipstickPromoWorkflow,
]

export async function getWorkflows() {
  // 从数据库获取工作流定义
  const dbWorkflows = await db.workflow.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // 合并内置工作流（内置优先）
  const workflowsMap = new Map<string, any>()
  for (const w of BUILT_IN_WORKFLOWS) {
    workflowsMap.set(w.code, w)
  }
  for (const w of dbWorkflows) {
    if (!workflowsMap.has(w.code)) {
      workflowsMap.set(w.code, {
        ...w,
        nodes: w.config ? JSON.parse(w.config as string) : [],
        edges: [],
      })
    }
  }

  return Array.from(workflowsMap.values())
}

export async function getWorkflowByCode(code: string) {
  // 先查内置
  const builtIn = BUILT_IN_WORKFLOWS.find(w => w.code === code)
  if (builtIn) return builtIn

  // 再查数据库
  const dbWorkflow = await db.workflow.findUnique({
    where: { code },
  })

  if (!dbWorkflow) return null

  return {
    ...dbWorkflow,
    nodes: dbWorkflow.config ? JSON.parse(dbWorkflow.config as string) : [],
    edges: [],
  }
}

export async function createWorkflow(data: {
  code: string
  name: string
  description?: string
  version?: string
  config?: any
}) {
  return db.workflow.create({
    data: {
      id: uuid(),
      code: data.code,
      name: data.name,
      description: data.description,
      version: data.version || '1.0',
      config: data.config ? JSON.stringify(data.config) : null,
    },
  })
}
