// domains/video-generation/tools/image-blend.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const ImageBlendTool: ToolDefinition = {
  id: 'image-blend',
  name: '双图编辑',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_IMAGE_BLEND || 'image-blend-workflow-id',
  inputs: [
    { name: 'imageA', type: 'image', required: true },
    { name: 'imageB', type: 'image', required: true },
    { name: 'prompt', type: 'text', required: true },
  ],
  outputs: [
    { name: 'result', type: 'image' },
  ],
}