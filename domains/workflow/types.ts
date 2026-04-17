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
  description?: string | null
  version: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  config?: Record<string, any> | string | null
}

export interface WorkflowExecutionResult {
  success: boolean
  videoUrl?: string
  thumbnailUrl?: string
  duration?: number
  error?: string
  nodeOutputs?: Record<string, Record<string, string | null>>
}
