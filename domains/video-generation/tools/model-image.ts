// domains/video-generation/tools/model-image.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const ModelImageTool: ToolDefinition = {
  id: 'model-image',
  name: '模特图生成',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_MODEL_IMAGE || 'model-image-workflow-id',
  inputs: [
    { name: 'ipFullBodyUrl', type: 'image', required: true },
    { name: 'productMainImage', type: 'image', required: true },
    { name: 'productDetailImages', type: 'image[]', required: false },
  ],
  outputs: [
    { name: 'modelImage', type: 'image' },
  ],
}
