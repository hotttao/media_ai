# 虚拟 IP 视频智能体 — Phase 3 实现计划

## 概述

Phase 3 实现工作流引擎和视频生成任务管理。核心包括：
- ToolProvider 抽象层（适配 ComfyUI / AI 服务）
- WorkflowEngine 节点图执行器
- 向导式视频生成 UI
- 异步任务调度

## 核心架构

### ToolProvider 接口

```typescript
// foundation/providers/ToolProvider.ts
export interface ToolResult {
  outputs: Record<string, string | null>  // output_name -> url or text
  error?: string
}

export interface ToolProvider {
  providerName: string  // 'comfyui' | 'jiemeng' | 'jixiang'
  execute(toolId: string, inputs: Record<string, string | null>): Promise<ToolResult>
  healthCheck(): Promise<boolean>
}
```

### RunningHub (ComfyUI) Provider

```typescript
// foundation/providers/RunningHubProvider.ts
interface RunningHubProviderConfig {
  apiKey: string
  baseUrl: string  // 'https://www.runninghub.cn/openapi/v2'
  webhookUrl?: string
}

export class RunningHubProvider implements ToolProvider {
  providerName = 'runninghub'
  private config: RunningHubProviderConfig

  constructor(config: RunningHubProviderConfig) {
    this.config = config
  }

  async execute(toolId: string, inputs: Record<string, string | null>): Promise<ToolResult> {
    // 1. 提交任务到 RunningHub
    const submitResponse = await fetch(`${this.config.baseUrl}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        workflowId: toolId,
        input: inputs,
        webhookUrl: this.config.webhookUrl,
      }),
    })
    const { taskId } = await submitResponse.json()

    // 2. 轮询任务状态直到完成
    while (true) {
      const statusResponse = await fetch(`${this.config.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ taskId }),
      })
      const { status, results } = await statusResponse.json()

      if (status === 'SUCCESS') {
        return { outputs: results }
      }
      if (status === 'FAILED') {
        return { outputs: {}, error: 'Task failed' }
      }
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
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

### 工具定义格式

每个工具定义存储在代码中：

```typescript
// domains/workflow/built-in/tools/lipstick-character.ts
export const LipstickCharacterTool = {
  id: 'lipstick-character',
  name: '生成人物',
  provider: 'runninghub',  // or 'jiemeng', 'jixiang'
  workflowId: 'xxx',  // RunningHub 工作流 ID
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

### 工作流定义

工作流 = 工具节点串联：

```typescript
// domains/workflow/built-in/workflows/lipstick-promo.ts
export const LipstickPromoWorkflow = {
  id: 'lipstick-promo',
  name: '口红带货视频',
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

### WorkflowEngine

```typescript
// domains/workflow/engine.ts
export interface ExecutionContext {
  teamId: string
  ipId: string
  userId: string
  nodes: Record<string, Record<string, string | null>>  // nodeId -> {outputName: url}
}

export class WorkflowEngine {
  async execute(
    workflow: Workflow,
    userParams: Record<string, string>,
    context: ExecutionContext
  ): Promise<{ videoUrl: string }> {
    // 1. 初始化 context.nodes，所有节点 outputs 初始为空
    // 2. 将 userParams 注入第一个节点的 inputs
    // 3. 按拓扑顺序执行每个节点：
    //    - 从前置节点获取 outputs
    //    - 调用 ToolProvider.execute()
    //    - 将结果存入 context.nodes[nodeId]
    // 4. 返回最终视频节点的 output
  }
}
```

## 数据库模型

```prisma
model Workflow {
  id          String   @id @default(uuid())
  code        String   @unique  // 'lipstick-promo'
  name        String
  description String?
  version     String   @default("1.0")
  nodes       Json     // ToolNode[]
  edges       Json     // Edge[]
  config      Json?    // workflow-specific config
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model VideoTask {
  id          String   @id @default(uuid())
  userId      String
  teamId      String
  ipId        String?
  workflowId  String
  status      WorkflowStatus @default(PENDING)
  params      Json     // user inputs
  result      Json?    // outputs
  error       String?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())

  user        User     @relation(...)
  team        Team     @relation(...)
  workflow    Workflow @relation(...)
  videos      Video[]
}

model Video {
  id          String   @id @default(uuid())
  taskId      String
  userId      String
  teamId      String
  name        String
  url         String
  thumbnail   String?
  duration    Int?
  size        BigInt?
  createdAt   DateTime @default(now())

  task        VideoTask @relation(...)
}
```

## API 设计

### 工作流

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/workflows | 列出可用工作流 |
| GET | /api/workflows/:code | 工作流详情（节点定义） |
| POST | /api/workflows/:code/preview | 预览执行参数 |
| POST | /api/workflows/:code/execute | 执行工作流（创建任务） |

### 任务

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/tasks | 任务列表 |
| GET | /api/tasks/:id | 任务详情 |
| GET | /api/tasks/:id/status | 轮询状态 |
| POST | /api/tasks/:id/cancel | 取消任务 |

### Webhook

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/webhooks/runninghub | RunningHub 回调 |

## 实现步骤

### Task 1: ToolProvider 基础设施

- 创建 `foundation/providers/ToolProvider.ts` 接口
- 创建 `foundation/providers/RunningHubProvider.ts` 实现
- 创建 `foundation/providers/registry.ts` 注册中心

### Task 2: 工作流 Domain 层

- 创建 `domains/workflow/types.ts` — Workflow, ToolNode, Edge 类型
- 创建 `domains/workflow/engine.ts` — WorkflowEngine 类
- 创建内置工具： LipstickCharacterTool, ProductPlacementTool, VideoGenTool

### Task 3: 工作流 API Routes

- GET /api/workflows
- GET /api/workflows/:code
- POST /api/workflows/:code/execute

### Task 4: 任务 Domain 层

- 创建 `domains/video/types.ts`
- 创建 `domains/video/service.ts` — createTask, getTaskStatus, updateTask

### Task 5: 任务 API Routes

- GET /api/tasks
- GET /api/tasks/:id
- POST /api/webhooks/runninghub

### Task 6: 向导式生成 UI — 工作流选择页

- 创建 `app/(app)/workflows/page.tsx` — 工作流卡片列表
- 创建 `components/workflow/WorkflowCard.tsx`

### Task 7: 向导式生成 UI — 参数填写页

- 创建 `app/(app)/workflows/[code]/wizard/page.tsx`
- 创建 `components/workflow/WizardStepper.tsx`
- 创建 `components/workflow/MaterialSelector.tsx`

### Task 8: 向导式生成 UI — 确认与执行

- 创建 `components/workflow/WorkflowConfirm.tsx`
- 实现任务创建和状态轮询

### Task 9: 任务列表页

- 创建 `app/(app)/tasks/page.tsx` — 任务列表
- 创建 `components/workflow/TaskStatusBadge.tsx`

## 文件结构

```
domains/
├── workflow/
│   ├── types.ts
│   ├── engine.ts
│   ├── registry.ts
│   ├── built-in/
│   │   ├── tools/
│   │   │   ├── lipstick-character.ts
│   │   │   ├── product-placement.ts
│   │   │   └── video-gen.ts
│   │   └── workflows/
│   │       └── lipstick-promo.ts
│   └── service.ts
└── video/
    ├── types.ts
    └── service.ts

foundation/
├── providers/
│   ├── ToolProvider.ts
│   ├── RunningHubProvider.ts
│   └── registry.ts

app/
├── (app)/
│   ├── workflows/
│   │   ├── page.tsx
│   │   └── [code]/
│   │       └── wizard/
│   │           └── page.tsx
│   └── tasks/
│       └── page.tsx
└── api/
    ├── workflows/
    │   ├── route.ts
    │   └── [code]/
    │       ├── route.ts
    │       └── execute/route.ts
    ├── tasks/
    │   ├── route.ts
    │   └── [id]/
    │       └── route.ts
    └── webhooks/
        └── runninghub/route.ts

components/
├── workflow/
│   ├── WorkflowCard.tsx
│   ├── WizardStepper.tsx
│   ├── MaterialSelector.tsx
│   ├── WorkflowConfirm.tsx
│   └── TaskStatusBadge.tsx
```