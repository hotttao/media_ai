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
