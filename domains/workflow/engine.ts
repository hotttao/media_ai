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
          const preOutputs = context.nodes[adj.nodeId]
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
        context.nodes[nodeId] = result.outputs

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

      const videoOutputs = context.nodes[videoNode.id]
      const videoUrl = videoOutputs
        ? Object.values(videoOutputs).find(v => v?.endsWith('.mp4') || v?.endsWith('.mov')) || Object.values(videoOutputs)[0]
        : undefined

      return {
        success: true,
        videoUrl: videoUrl || undefined,
        nodeOutputs: context.nodes,
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
