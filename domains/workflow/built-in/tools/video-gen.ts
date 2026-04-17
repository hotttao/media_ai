// domains/workflow/built-in/tools/video-gen.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const VideoGenTool: ToolDefinition = {
  id: 'video-gen',
  name: '生成视频',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_VIDEO || 'video-workflow-id',
  inputs: [
    { name: 'character', type: 'image', required: true },
    { name: 'action', type: 'text', required: true },
    { name: 'expression', type: 'text', required: false },
    { name: 'lighting', type: 'text', required: false },
    { name: 'composition', type: 'text', required: false },
  ],
  outputs: [
    { name: 'video', type: 'video', required: true },
  ],
}
