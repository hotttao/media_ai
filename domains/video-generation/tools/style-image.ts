// domains/video-generation/tools/style-image.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const StyleImageTool: ToolDefinition = {
  id: 'style-image',
  name: '定妆图生成',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_STYLE_IMAGE || 'style-image-workflow-id',
  inputs: [
    { name: 'modelImage', type: 'image', required: true },
    { name: 'pose', type: 'text', required: true },
    { name: 'makeup', type: 'image', required: false },
    { name: 'accessory', type: 'image', required: false },
  ],
  outputs: [
    { name: 'styledImage', type: 'image' },
  ],
}
