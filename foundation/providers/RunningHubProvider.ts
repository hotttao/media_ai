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
