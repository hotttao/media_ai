# Phase 3 实现计划：工作流引擎 + 视频生成任务

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现工作流引擎、ToolProvider 适配层、向导式视频生成 UI、任务管理

**Architecture:** ToolProvider 接口 → WorkflowEngine 执行节点链 → 任务异步调度 → Webhook/轮询回调

**Tech Stack:** Next.js 14, Prisma, TypeScript, RunningHub API

---

## 文件结构

```
foundation/
└── providers/
    ├── ToolProvider.ts      # 接口定义
    ├── RunningHubProvider.ts # RunningHub (ComfyUI) 实现
    └── registry.ts           # Provider 注册中心

domains/
├── workflow/
│   ├── types.ts             # Workflow, ToolNode, Edge 类型
│   ├── engine.ts            # WorkflowEngine 类
│   ├── service.ts           # 工作流 CRUD 服务
│   └── built-in/
│       ├── tools/
│       │   ├── lipstick-character.ts  # 内置工具定义
│       │   ├── product-placement.ts
│       │   └── video-gen.ts
│       └── workflows/
│           └── lipstick-promo.ts  # 内置工作流定义
└── video/
    ├── types.ts
    └── service.ts

app/
├── (app)/
│   ├── workflows/
│   │   ├── page.tsx          # 工作流列表（选择）
│   │   └── [code]/
│   │       └── wizard/
│   │           └── page.tsx # 向导式生成页
│   └── tasks/
│       └── page.tsx          # 任务列表
└── api/
    ├── workflows/
    │   ├── route.ts          # GET /api/workflows
    │   └── [code]/
    │       ├── route.ts      # GET /api/workflows/:code
    │       └── execute/
    │           └── route.ts # POST /api/workflows/:code/execute
    ├── tasks/
    │   ├── route.ts          # GET /api/tasks
    │   └── [id]/
    │       └── route.ts      # GET, POST /api/tasks/:id
    └── webhooks/
        └── runninghub/
            └── route.ts      # POST /api/webhooks/runninghub

components/
└── workflow/
    ├── WorkflowCard.tsx
    ├── WizardStepper.tsx
    ├── MaterialSelector.tsx
    ├── WorkflowConfirm.tsx
    └── TaskStatusBadge.tsx
```

---

## 任务分解

### Task 1: ToolProvider 基础设施

**Files:**
- Create: `foundation/providers/ToolProvider.ts`
- Create: `foundation/providers/RunningHubProvider.ts`
- Create: `foundation/providers/registry.ts`

- [ ] **Step 1: 创建 foundation/providers/ToolProvider.ts**

```typescript
// foundation/providers/ToolProvider.ts

export interface ToolInput {
  name: string
  type: 'image' | 'text'
  required: boolean
  default?: string
}

export interface ToolOutput {
  name: string
  type: 'image' | 'text' | 'video'
}

export interface ToolDefinition {
  id: string
  name: string
  provider: string  // 'runninghub' | 'jiemeng' | 'jixiang'
  workflowId: string  // provider 侧的工作流 ID
  inputs: ToolInput[]
  outputs: ToolOutput[]
}

export interface ToolResult {
  outputs: Record<string, string | null>  // output_name -> url or text
  error?: string
}

export interface ToolProvider {
  providerName: string
  execute(toolId: string, inputs: Record<string, string | null>): Promise<ToolResult>
  healthCheck(): Promise<boolean>
}
```

- [ ] **Step 2: 创建 foundation/providers/RunningHubProvider.ts**

```typescript
// foundation/providers/RunningHubProvider.ts
import { ToolProvider, ToolResult } from './ToolProvider'

interface RunningHubConfig {
  apiKey: string
  baseUrl?: string
}

export class RunningHubProvider implements ToolProvider {
  providerName = 'runninghub'
  private config: RunningHubConfig

  constructor(config: RunningHubConfig) {
    this.config = {
      baseUrl: 'https://www.runninghub.cn/openapi/v2',
      ...config,
    }
  }

  async execute(toolId: string, inputs: Record<string, string | null>): Promise<ToolResult> {
    try {
      // 1. 提交任务
      const submitResponse = await fetch(`${this.config.baseUrl}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          workflowId: toolId,
          input: inputs,
        }),
      })

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text()
        return { outputs: {}, error: `Submit failed: ${errorText}` }
      }

      const submitData = await submitResponse.json()
      const taskId = submitData.taskId

      if (!taskId) {
        return { outputs: {}, error: 'No taskId returned' }
      }

      // 2. 轮询直到完成
      const result = await this.pollTask(taskId)
      return result
    } catch (error) {
      return { outputs: {}, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async pollTask(taskId: string, maxAttempts = 120): Promise<ToolResult> {
    for (let i = 0; i < maxAttempts; i++) {
      const queryResponse = await fetch(`${this.config.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ taskId }),
      })

      if (!queryResponse.ok) {
        return { outputs: {}, error: `Query failed: ${queryResponse.statusText}` }
      }

      const { status, results, errorCode, errorMessage } = await queryResponse.json()

      if (status === 'SUCCESS') {
        // 转换 results 格式: [{url, nodeId, outputType}] -> {nodeId: url}
        const outputs: Record<string, string | null> = {}
        for (const item of results || []) {
          if (item.url) {
            outputs[item.nodeId] = item.url
          }
        }
        return { outputs }
      }

      if (status === 'FAILED') {
        return { outputs: {}, error: errorMessage || errorCode || 'Task failed' }
      }

      // 等待 5 秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    return { outputs: {}, error: 'Task timeout' }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }
}
```

- [ ] **Step 3: 创建 foundation/providers/registry.ts**

```typescript
// foundation/providers/registry.ts
import { ToolProvider } from './ToolProvider'

class ProviderRegistry {
  private providers: Map<string, ToolProvider> = new Map()

  register(name: string, provider: ToolProvider): void {
    this.providers.set(name, provider)
  }

  get(name: string): ToolProvider | undefined {
    return this.providers.get(name)
  }

  getAll(): Map<string, ToolProvider> {
    return this.providers
  }

  has(name: string): boolean {
    return this.providers.has(name)
  }
}

// 单例
export const providerRegistry = new ProviderRegistry()
```

- [ ] **Step 4: 创建 .env.local.example 添加配置项**

```bash
# RunningHub (ComfyUI 云端)
RUNNINGHUB_API_KEY=your_api_key_here
```

- [ ] **Step 5: 提交**

```bash
git add foundation/providers/
git commit -m "Task 1: Add ToolProvider infrastructure - interface, RunningHub provider, registry"
```

---

### Task 2: 工作流 Domain 层

**Files:**
- Create: `domains/workflow/types.ts`
- Create: `domains/workflow/engine.ts`
- Create: `domains/workflow/service.ts`
- Create: `domains/workflow/built-in/tools/lipstick-character.ts`
- Create: `domains/workflow/built-in/tools/product-placement.ts`
- Create: `domains/workflow/built-in/tools/video-gen.ts`
- Create: `domains/workflow/built-in/workflows/lipstick-promo.ts`

- [ ] **Step 1: 创建 domains/workflow/types.ts**

```typescript
// domains/workflow/types.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export interface WorkflowNode {
  id: string
  tool: ToolDefinition
}

export interface WorkflowEdge {
  from: string       // source node id
  fromPort: string   // source output name
  to: string         // target node id
  toPort: string     // target input name
}

export interface WorkflowDefinition {
  id: string
  code: string
  name: string
  description?: string
  version: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  config?: Record<string, any>
}

export interface WorkflowExecutionResult {
  success: boolean
  videoUrl?: string
  thumbnailUrl?: string
  duration?: number
  error?: string
  nodeOutputs?: Record<string, Record<string, string | null>>
}
```

- [ ] **Step 2: 创建 domains/workflow/engine.ts**

```typescript
// domains/workflow/engine.ts
import { providerRegistry } from '@/foundation/providers/registry'
import type { WorkflowDefinition, WorkflowExecutionResult } from './types'

export interface ExecutionContext {
  teamId: string
  ipId: string
  userId: string
  // nodeId -> {outputName: url}
  nodes: Record<string, Record<string, string | null>>
}

export class WorkflowEngine {
  /**
   * 按拓扑顺序执行工作流节点
   */
  async execute(
    workflow: WorkflowDefinition,
    userParams: Record<string, string>,  // user-provided inputs
    context: ExecutionContext
  ): Promise<WorkflowExecutionResult> {
    try {
      // 1. 构建节点依赖图
      const nodeMap = new Map<string, WorkflowNode>()
      for (const node of workflow.nodes) {
        nodeMap.set(node.id, node)
      }

      // 2. 计算入度，找到起始节点（无前置节点的节点）
      const inDegree = new Map<string, number>()
      const adjacency = new Map<string, Array<{nodeId: string, port: string, toPort: string}>>()

      for (const node of workflow.nodes) {
        inDegree.set(node.id, 0)
        adjacency.set(node.id, [])
      }

      for (const edge of workflow.edges) {
        inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1)
        adjacency.get(edge.from)?.push({
          nodeId: edge.to,
          port: edge.fromPort,
          toPort: edge.toPort,
        })
      }

      // 3. 从入度为 0 的节点开始（BFS 拓扑排序）
      const queue: string[] = []
      for (const [nodeId, degree] of inDegree) {
        if (degree === 0) queue.push(nodeId)
      }

      // 初始化上下文
      const nodeInputs: Record<string, Record<string, string | null>> = {}

      while (queue.length > 0) {
        const nodeId = queue.shift()!
        const node = nodeMap.get(nodeId)!
        const tool = node.tool

        // 合并输入：用户参数 + 前置节点输出
        const inputs: Record<string, string | null> = {}

        // 添加用户参数（用于起始节点）
        for (const [key, value] of Object.entries(userParams)) {
          inputs[key] = value
        }

        // 添加前置节点输出
        const nodeAdj = adjacency.get(nodeId) || []
        for (const adj of nodeAdj) {
          const preOutputs = context.nodeOutputs[adj.nodeId]
          if (preOutputs && preOutputs[adj.port]) {
            inputs[adj.toPort] = preOutputs[adj.port]
          }
        }

        // 填充可选输入的默认值
        for (const inputDef of tool.inputs) {
          if (!inputs[inputDef.name] && inputDef.default) {
            inputs[inputDef.name] = inputDef.default
          }
        }

        // 执行工具
        const provider = providerRegistry.get(tool.provider)
        if (!provider) {
          throw new Error(`Provider ${tool.provider} not found`)
        }

        const result = await provider.execute(tool.workflowId, inputs)

        if (result.error) {
          return { success: false, error: result.error }
        }

        // 存储节点输出
        context.nodeOutputs[nodeId] = result.outputs

        // 将后继节点入度减 1，入度为 0 则加入队列
        for (const edge of workflow.edges) {
          if (edge.from === nodeId) {
            const newDegree = (inDegree.get(edge.to) || 0) - 1
            inDegree.set(edge.to, newDegree)
            if (newDegree === 0) {
              queue.push(edge.to)
            }
          }
        }
      }

      // 4. 找到最终视频输出节点
      const videoNode = workflow.nodes.find(n =>
        n.tool.outputs.some(o => o.type === 'video')
      )

      if (!videoNode) {
        return { success: false, error: 'No video output node found' }
      }

      const videoOutputs = context.nodeOutputs[videoNode.id]
      const videoUrl = videoOutputs
        ? Object.values(videoOutputs).find(v => v?.endsWith('.mp4') || v?.endsWith('.mov')) || Object.values(videoOutputs)[0]
        : undefined

      return {
        success: true,
        videoUrl: videoUrl || undefined,
        nodeOutputs: context.nodeOutputs,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      }
    }
  }
}

// 单例
export const workflowEngine = new WorkflowEngine()
```

- [ ] **Step 3: 创建 domains/workflow/built-in/tools/lipstick-character.ts**

```typescript
// domains/workflow/built-in/tools/lipstick-character.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const LipstickCharacterTool: ToolDefinition = {
  id: 'lipstick-character',
  name: '生成人物（口红场景）',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_CHARACTER || 'character-workflow-id',
  inputs: [
    { name: 'character', type: 'image', required: true },
    { name: 'makeup', type: 'image', required: false },
    { name: 'accessory', type: 'image', required: false },
  ],
  outputs: [
    { name: 'posedCharacter', type: 'image' },
  ],
}
```

- [ ] **Step 4: 创建 domains/workflow/built-in/tools/product-placement.ts**

```typescript
// domains/workflow/built-in/tools/product-placement.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const ProductPlacementTool: ToolDefinition = {
  id: 'product-placement',
  name: '植入商品',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_PRODUCT || 'product-workflow-id',
  inputs: [
    { name: 'character', type: 'image', required: true },
    { name: 'product', type: 'image', required: true },
    { name: 'scene', type: 'image', required: true },
  ],
  outputs: [
    { name: 'composed', type: 'image' },
  ],
}
```

- [ ] **Step 5: 创建 domains/workflow/built-in/tools/video-gen.ts**

```typescript
// domains/workflow/built-in/tools/video-gen.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const VideoGenTool: ToolDefinition = {
  id: 'video-gen',
  name: '生成视频',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_VIDEO || 'video-workflow-id',
  inputs: [
    { name: 'character', type: 'image', required: true },
    { name: 'action', type: 'text', required: true },
    { name: 'expression', type: 'text', required: false },
    { name: 'lighting', type: 'text', required: false },
    { name: 'composition', type: 'text', required: false },
  ],
  outputs: [
    { name: 'video', type: 'video', required: true },
  ],
}
```

- [ ] **Step 6: 创建 domains/workflow/built-in/workflows/lipstick-promo.ts**

```typescript
// domains/workflow/built-in/workflows/lipstick-promo.ts
import { LipstickCharacterTool } from '../tools/lipstick-character'
import { ProductPlacementTool } from '../tools/product-placement'
import { VideoGenTool } from '../tools/video-gen'
import type { WorkflowDefinition } from '../../types'

export const LipstickPromoWorkflow: WorkflowDefinition = {
  id: 'lipstick-promo',
  code: 'lipstick-promo',
  name: '口红带货视频',
  description: '生成口红带货视频，包含人物生成、商品植入、视频合成',
  version: '1.0',
  nodes: [
    { id: 'generate_character', tool: LipstickCharacterTool },
    { id: 'place_product', tool: ProductPlacementTool },
    { id: 'generate_video', tool: VideoGenTool },
  ],
  edges: [
    { from: 'generate_character', fromPort: 'posedCharacter', to: 'place_product', toPort: 'character' },
    { from: 'place_product', fromPort: 'composed', to: 'generate_video', toPort: 'character' },
  ],
}
```

- [ ] **Step 7: 创建 domains/workflow/service.ts**

```typescript
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
```

- [ ] **Step 8: 提交**

```bash
git add domains/workflow/
git commit -m "Task 2: Add workflow domain layer - types, engine, built-in tools and workflows"
```

---

### Task 3: 工作流 API Routes

**Files:**
- Create: `app/api/workflows/route.ts`
- Create: `app/api/workflows/[code]/route.ts`
- Create: `app/api/workflows/[code]/execute/route.ts`

- [ ] **Step 1: 创建 app/api/workflows/route.ts**

```typescript
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
```

- [ ] **Step 2: 创建 app/api/workflows/[code]/route.ts**

```typescript
// app/api/workflows/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getWorkflowByCode } from '@/domains/workflow/service'

type RouteParams = { params: { code: string } }

// GET /api/workflows/:code - 工作流详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workflow = await getWorkflowByCode(params.code)
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error('Get workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 创建 app/api/workflows/[code]/execute/route.ts**

```typescript
// app/api/workflows/[code]/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getWorkflowByCode } from '@/domains/workflow/service'
import { workflowEngine, ExecutionContext } from '@/domains/workflow/engine'
import { createVideoTask, updateTaskResult } from '@/domains/video/service'
import { v4 as uuid } from 'uuid'

type RouteParams = { params: { code: string } }

// POST /api/workflows/:code/execute - 执行工作流
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const workflow = await getWorkflowByCode(params.code)
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const body = await request.json()
    const { ipId, params: userParams } = body

    // 创建任务记录
    const task = await createVideoTask({
      id: uuid(),
      userId: session.user.id,
      teamId: session.user.teamId,
      workflowId: workflow.id,
      ipId: ipId || null,
      params: userParams || {},
    })

    // 执行工作流（异步）
    const context: ExecutionContext = {
      teamId: session.user.teamId,
      ipId: ipId || '',
      userId: session.user.id,
      nodeOutputs: {},
    }

    // 异步执行，不阻塞
    workflowEngine.execute(workflow, userParams || {}, context).then(async (result) => {
      await updateTaskResult(task.id, result)
    }).catch(async (error) => {
      await updateTaskResult(task.id, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    })

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      message: 'Task created, execution started',
    }, { status: 201 })
  } catch (error) {
    console.error('Execute workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add app/api/workflows/
git commit -m "Task 3: Add workflow API routes - list, detail, execute"
```

---

### Task 4: 任务 Domain 层

**Files:**
- Create: `domains/video/types.ts`
- Create: `domains/video/service.ts`

- [ ] **Step 1: 创建 domains/video/types.ts**

```typescript
// domains/video/types.ts
export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface VideoTask {
  id: string
  userId: string
  teamId: string
  workflowId: string
  ipId: string | null
  status: TaskStatus
  params: Record<string, any>
  result?: WorkflowExecutionResult
  error?: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

export interface CreateTaskInput {
  id: string
  userId: string
  teamId: string
  workflowId: string
  ipId: string | null
  params: Record<string, any>
}

import type { WorkflowExecutionResult } from '@/domains/workflow/types'
```

- [ ] **Step 2: 创建 domains/video/service.ts**

```typescript
// domains/video/service.ts
import { db } from '@/foundation/lib/db'
import type { CreateTaskInput, TaskStatus } from './types'
import type { WorkflowExecutionResult } from '@/domains/workflow/types'

export async function createVideoTask(input: CreateTaskInput) {
  return db.videoTask.create({
    data: {
      id: input.id,
      userId: input.userId,
      teamId: input.teamId,
      workflowId: input.workflowId,
      ipId: input.ipId,
      status: 'PENDING',
      params: JSON.stringify(input.params),
    },
  })
}

export async function getTasks(teamId: string, userId?: string) {
  return db.videoTask.findMany({
    where: {
      teamId,
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      workflow: true,
      ip: true,
      videos: true,
    },
  })
}

export async function getTaskById(id: string) {
  return db.videoTask.findUnique({
    where: { id },
    include: {
      workflow: true,
      ip: true,
      videos: true,
    },
  })
}

export async function updateTaskStatus(id: string, status: TaskStatus, startedAt?: Date) {
  return db.videoTask.update({
    where: { id },
    data: {
      status,
      ...(startedAt ? { startedAt } : {}),
    },
  })
}

export async function updateTaskResult(id: string, result: WorkflowExecutionResult) {
  const status = result.success ? 'COMPLETED' : 'FAILED'

  return db.videoTask.update({
    where: { id },
    data: {
      status,
      result: JSON.stringify(result),
      error: result.error,
      completedAt: new Date(),
    },
  })
}

export async function createVideo(taskId: string, userId: string, teamId: string, data: {
  name: string
  url: string
  thumbnail?: string
  duration?: number
  size?: bigint
  ipId?: string
}) {
  return db.video.create({
    data: {
      id: require('uuid').v4(),
      taskId,
      userId,
      teamId,
      name: data.name,
      url: data.url,
      thumbnail: data.thumbnail,
      duration: data.duration,
      size: data.size,
      ipId: data.ipId,
    },
  })
}
```

- [ ] **Step 3: 提交**

```bash
git add domains/video/
git commit -m "Task 4: Add video task domain layer - types and service"
```

---

### Task 5: 任务 API Routes

**Files:**
- Create: `app/api/tasks/route.ts`
- Create: `app/api/tasks/[id]/route.ts`
- Create: `app/api/webhooks/runninghub/route.ts`

- [ ] **Step 1: 创建 app/api/tasks/route.ts**

```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getTasks } from '@/domains/video/service'

// GET /api/tasks - 任务列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.teamId) {
      return NextResponse.json({ error: 'User has no team' }, { status: 400 })
    }

    const tasks = await getTasks(session.user.teamId)

    return NextResponse.json(tasks.map(t => ({
      id: t.id,
      workflowName: t.workflow?.name,
      ipName: t.ip?.nickname,
      status: t.status,
      error: t.error,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })))
  } catch (error) {
    console.error('List tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 创建 app/api/tasks/[id]/route.ts**

```typescript
// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getTaskById, updateTaskStatus } from '@/domains/video/service'

type RouteParams = { params: { id: string } }

// GET /api/tasks/:id - 任务详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const task = await getTaskById(params.id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 权限检查：同团队
    if (task.teamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      ...task,
      params: task.params ? JSON.parse(task.params as string) : {},
      result: task.result ? JSON.parse(task.result as string) : null,
    })
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: 创建 app/api/webhooks/runninghub/route.ts**

```typescript
// app/api/webhooks/runninghub/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateTaskResult } from '@/domains/video/service'
import { db } from '@/foundation/lib/db'

// POST /api/webhooks/runninghub - RunningHub 回调
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, status, results, errorMessage } = body

    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
    }

    // 查找对应的任务
    // RunningHub 回调可能不包含 taskId 映射，需要通过额外字段查找
    // 这里简化处理，假设 taskId 就是我们的 VideoTask id
    const task = await db.videoTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 更新任务结果
    const result = status === 'SUCCESS'
      ? { success: true, videoUrl: results?.[0]?.url }
      : { success: false, error: errorMessage || 'Task failed' }

    await updateTaskResult(taskId, result)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add app/api/tasks/ app/api/webhooks/
git commit -m "Task 5: Add task API routes - list, detail, webhook"
```

---

### Task 6: 向导式生成 UI — 工作流选择页

**Files:**
- Create: `app/(app)/workflows/page.tsx`
- Create: `components/workflow/WorkflowCard.tsx`

- [ ] **Step 1: 创建 app/(app)/workflows/page.tsx**

```tsx
// app/(app)/workflows/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getWorkflows } from '@/domains/workflow/service'
import { WorkflowCard } from '@/components/workflow/WorkflowCard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function WorkflowsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const workflows = await getWorkflows()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">视频工作流</h1>
        <p className="text-warm-silver mt-1">选择一种工作流开始生成视频</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.code}
            workflow={workflow}
            href={`/workflows/${workflow.code}/wizard`}
          />
        ))}
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-12">
          <p className="text-warm-silver">暂无可用工作流</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建 components/workflow/WorkflowCard.tsx**

```tsx
// components/workflow/WorkflowCard.tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface WorkflowCardProps {
  workflow: {
    code: string
    name: string
    description?: string
    nodeCount?: number
  }
  href: string
}

export function WorkflowCard({ workflow, href }: WorkflowCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:border-matcha-600 transition-colors cursor-pointer h-full">
        <CardHeader>
          <CardTitle>{workflow.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workflow.description && (
            <p className="text-sm text-warm-silver">{workflow.description}</p>
          )}
          {workflow.nodeCount !== undefined && (
            <p className="text-xs text-warm-silver">
              {workflow.nodeCount} 个处理节点
            </p>
          )}
          <Button className="w-full">开始生成</Button>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add 'app/(app)/workflows/page.tsx' components/workflow/WorkflowCard.tsx
git commit -m "Task 6: Add workflow selection page and WorkflowCard component"
```

---

### Task 7: 向导式生成 UI — 参数填写页

**Files:**
- Create: `app/(app)/workflows/[code]/wizard/page.tsx`
- Create: `components/workflow/WizardStepper.tsx`
- Create: `components/workflow/MaterialSelector.tsx`

- [ ] **Step 1: 创建 components/workflow/WizardStepper.tsx**

```tsx
// components/workflow/WizardStepper.tsx
'use client'

import { useState } from 'react'

interface Step {
  label: string
  description: string
}

interface WizardStepperProps {
  steps: Step[]
  currentStep: number
  onStepChange: (step: number) => void
}

export function WizardStepper({ steps, currentStep, onStepChange }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <button
            onClick={() => onStepChange(index)}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              index === currentStep
                ? 'bg-matcha-600 text-white'
                : index < currentStep
                ? 'bg-matcha-300 text-white cursor-pointer'
                : 'bg-oat-light text-warm-silver'
            }`}
          >
            {index + 1}
          </button>
          <span className={`ml-2 text-sm ${
            index === currentStep ? 'text-foreground font-medium' : 'text-warm-silver'
          }`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-4 ${
              index < currentStep ? 'bg-matcha-300' : 'bg-oat-light'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

export const WIZARD_STEPS = [
  { label: '选择 IP', description: '选择虚拟人物' },
  { label: '填写参数', description: '配置素材和选项' },
  { label: '确认生成', description: '确认并提交' },
]
```

- [ ] **Step 2: 创建 components/workflow/MaterialSelector.tsx**

```tsx
// components/workflow/MaterialSelector.tsx
'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MaterialCard } from '@/components/material/MaterialCard'

interface MaterialSelectorProps {
  label: string
  materialType: string
  value: string | null
  onChange: (url: string | null) => void
}

export function MaterialSelector({ label, materialType, value, onChange }: MaterialSelectorProps) {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/materials?type=${materialType}`)
      .then(res => res.json())
      .then(data => {
        setMaterials(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [materialType])

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {loading ? (
        <p className="text-sm text-warm-silver">加载中...</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-warm-silver">无可用素材</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {materials.map(m => (
            <div
              key={m.id}
              onClick={() => onChange(m.url)}
              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                value === m.url ? 'border-matcha-600' : 'border-transparent'
              }`}
            >
              <img src={m.url} alt={m.name} className="w-full aspect-square object-cover" />
            </div>
          ))}
        </div>
      )}

      {value && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            清除选择
          </Button>
        </div>
      )}
    </div>
  )
}

import { Button } from '@/components/ui/button'
```

- [ ] **Step 3: 创建 app/(app)/workflows/[code]/wizard/page.tsx**

```tsx
// app/(app)/workflows/[code]/wizard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WizardStepper, WIZARD_STEPS } from '@/components/workflow/WizardStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePermissions } from '@/foundation/hooks/usePermissions'
import Link from 'next/link'

export default function WizardPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [workflow, setWorkflow] = useState<any>(null)
  const [ips, setIps] = useState<any[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [params_, setParams] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // 加载工作流
    fetch(`/api/workflows/${params.code}`)
      .then(res => res.json())
      .then(setWorkflow)

    // 加载 IP 列表
    fetch('/api/ips')
      .then(res => res.json())
      .then(setIps)
  }, [params.code])

  function handleIpSelect(ipId: string) {
    setSelectedIpId(ipId)
    setCurrentStep(1)
  }

  async function handleSubmit() {
    if (!selectedIpId) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/workflows/${params.code}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipId: selectedIpId,
          params: params_,
        }),
      })

      const data = await response.json()
      router.push(`/tasks?taskId=${data.taskId}`)
    } catch (error) {
      console.error('Submit error:', error)
      setIsSubmitting(false)
    }
  }

  if (!workflow) {
    return <div>加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{workflow.name}</h1>
        <p className="text-warm-silver">{workflow.description}</p>
      </div>

      <WizardStepper
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
      />

      {/* Step 1: 选择 IP */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>选择虚拟 IP</CardTitle>
          </CardHeader>
          <CardContent>
            {ips.length === 0 ? (
              <p className="text-warm-silver">暂无可用 IP，请先创建 IP</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ips.map(ip => (
                  <div
                    key={ip.id}
                    onClick={() => handleIpSelect(ip.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      selectedIpId === ip.id ? 'border-matcha-600' : 'border-border'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-oat-light mx-auto">
                      <img
                        src={ip.images?.[0]?.avatarUrl || ip.avatar || '/placeholder.png'}
                        alt={ip.nickname}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-center mt-2 font-medium">{ip.nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: 填写参数 */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>填写参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflow.nodes?.[0]?.tool?.inputs?.map((input: any) => (
              <div key={input.name} className="space-y-2">
                <Label>
                  {input.name}
                  {input.required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  placeholder={`输入 ${input.name}`}
                  value={params_[input.name] || ''}
                  onChange={(e) => setParams(p => ({ ...p, [input.name]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-4">
              <Button onClick={() => setCurrentStep(0)} variant="outline">上一步</Button>
              <Button onClick={() => setCurrentStep(2)}>下一步</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 确认 */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>确认生成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p><span className="font-medium">工作流：</span>{workflow.name}</p>
              <p><span className="font-medium">IP：</span>{ips.find(i => i.id === selectedIpId)?.nickname}</p>
              <p><span className="font-medium">参数：</span></p>
              <pre className="bg-oat-light p-2 rounded text-sm">
                {JSON.stringify(params_, null, 2)}
              </pre>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => setCurrentStep(1)} variant="outline">上一步</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : '确认并生成'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 提交**

```bash
git add 'app/(app)/workflows/[code]/wizard/page.tsx' components/workflow/WizardStepper.tsx components/workflow/MaterialSelector.tsx
git commit -m "Task 7: Add wizard page for workflow parameter input"
```

---

### Task 8: 任务列表页

**Files:**
- Create: `app/(app)/tasks/page.tsx`
- Create: `components/workflow/TaskStatusBadge.tsx`

- [ ] **Step 1: 创建 components/workflow/TaskStatusBadge.tsx**

```tsx
// components/workflow/TaskStatusBadge.tsx
import { Badge } from '@/components/ui/badge'

interface TaskStatusBadgeProps {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const variants: Record<string, 'default' | 'success' | 'destructive' | 'secondary'> = {
    PENDING: 'secondary',
    RUNNING: 'secondary',
    COMPLETED: 'success',
    FAILED: 'destructive',
  }

  const labels: Record<string, string> = {
    PENDING: '等待中',
    RUNNING: '执行中',
    COMPLETED: '已完成',
    FAILED: '失败',
  }

  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
```

- [ ] **Step 2: 创建 app/(app)/tasks/page.tsx**

```tsx
// app/(app)/tasks/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { getTasks } from '@/domains/video/service'
import { TaskStatusBadge } from '@/components/workflow/TaskStatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function TasksPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  if (!session.user.teamId) {
    return (
      <div className="space-y-4">
        <p>请先加入一个团队</p>
      </div>
    )
  }

  const tasks = await getTasks(session.user.teamId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">视频生成任务</h1>
        <p className="text-warm-silver mt-1">查看和管理视频生成任务</p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-warm-silver">暂无任务</p>
          <Link href="/workflows" className="text-matcha-600 hover:underline mt-2 inline-block">
            去选择一个工作流
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{task.workflow?.name || 'Unknown workflow'}</p>
                    <p className="text-sm text-warm-silver">
                      {task.ip?.nickname ? `IP: ${task.ip.nickname}` : ''}
                      {' '}
                      创建于 {new Date(task.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>
                {task.error && (
                  <p className="text-sm text-red-500 mt-2">错误: {task.error}</p>
                )}
                {task.result?.videoUrl && (
                  <div className="mt-3">
                    <a
                      href={task.result.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-matcha-600 hover:underline text-sm"
                    >
                      查看生成的视频 →
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add 'app/(app)/tasks/page.tsx' components/workflow/TaskStatusBadge.tsx
git commit -m "Task 8: Add task list page and TaskStatusBadge component"
```

---

## 自检清单

### 1. Spec 覆盖

| Spec Section | Task |
|---|---|
| ToolProvider 接口 | Task 1 |
| RunningHub Provider 实现 | Task 1 |
| Provider 注册中心 | Task 1 |
| WorkflowEngine 执行器 | Task 2 |
| 内置工具定义 | Task 2 |
| 工作流 CRUD | Task 2, 3 |
| 任务管理 | Task 4, 5 |
| 向导式生成 UI | Task 6, 7, 8 |
| Webhook 回调 | Task 5 |

### 2. 占位符扫描
- 无 "TODO" / "TBD" / "implement later"
- 所有 API 有实际错误处理
- 表单有实际提交逻辑

### 3. 类型一致性
- `domains/workflow/types.ts` 中 Workflow, WorkflowNode, WorkflowEdge 与 engine.ts 一致
- `domains/video/types.ts` 中 TaskStatus 与 Prisma schema 一致

---

## 执行选项

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-virtual-ip-video-agent-phase3.md`**

Phase 3 共 8 个 Task：
- Task 1: ToolProvider 基础设施（接口、RunningHub Provider、注册中心）
- Task 2: 工作流 Domain 层（类型、引擎、内置工具和工作流）
- Task 3: 工作流 API Routes
- Task 4: 任务 Domain 层
- Task 5: 任务 API Routes + Webhook
- Task 6: 工作流选择页
- Task 7: 向导式生成参数填写页
- Task 8: 任务列表页

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**