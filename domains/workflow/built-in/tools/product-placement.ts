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
