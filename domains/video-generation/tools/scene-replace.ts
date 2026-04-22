// domains/video-generation/tools/scene-replace.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const SceneReplaceTool: ToolDefinition = {
  id: 'scene-replace',
  name: '场景替换',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_SCENE_REPLACE || 'scene-replace-workflow-id',
  inputs: [
    { name: 'character', type: 'image', required: true },
    { name: 'scene', type: 'image', required: true },
  ],
  outputs: [
    { name: 'firstFrame', type: 'image' },
  ],
}