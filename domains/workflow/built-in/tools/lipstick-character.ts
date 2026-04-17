// domains/workflow/built-in/tools/lipstick-character.ts
import type { ToolDefinition } from '@/foundation/providers/ToolProvider'

export const LipstickCharacterTool: ToolDefinition = {
  id: 'lipstick-character',
  name: '生成人物（口红场景）',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_CHARACTER || 'character-workflow-id',
  inputs: [
    { name: 'character', type: 'image', required: true },
    { name: 'makeup', type: 'image', required: false },
    { name: 'accessory', type: 'image', required: false },
  ],
  outputs: [
    { name: 'posedCharacter', type: 'image' },
  ],
}
