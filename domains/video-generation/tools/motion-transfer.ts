// domains/video-generation/tools/motion-transfer.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const MotionTransferTool: ToolDefinition = {
  id: 'motion-transfer',
  name: '动作迁移',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_MOTION_TRANSFER || 'motion-transfer-workflow-id',
  inputs: [
    { name: 'image', type: 'image', required: true },
    { name: 'actionVideo', type: 'text', required: true },  // video URL passed as text
  ],
  outputs: [
    { name: 'video', type: 'video' },
  ],
}