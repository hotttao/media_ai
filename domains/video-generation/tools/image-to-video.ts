// domains/video-generation/tools/image-to-video.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const ImageToVideoTool: ToolDefinition = {
  id: 'image-to-video',
  name: '图生视频',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_IMAGE_TO_VIDEO || 'image-to-video-workflow-id',
  inputs: [
    { name: 'image', type: 'image', required: true },
    { name: 'actionText', type: 'text', required: true },
    { name: 'expression', type: 'text', required: false },
    { name: 'lighting', type: 'text', required: false },
  ],
  outputs: [
    { name: 'video', type: 'video' },
  ],
}