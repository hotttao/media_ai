// domains/video-generation/tools/multi-image-edit.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const MultiImageEditTool: ToolDefinition = {
  id: 'multi-image-edit',
  name: '多图编辑',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_MULTI_IMAGE_EDIT || 'multi-image-edit-workflow-id',
  inputs: [
    { name: 'images', type: 'image[]', required: true },
    { name: 'prompt', type: 'text', required: true },
  ],
  outputs: [
    { name: 'result', type: 'image' },
  ],
}
