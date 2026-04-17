// domains/workflow/built-in/workflows/lipstick-promo.ts
import { LipstickCharacterTool } from '../tools/lipstick-character'
import { ProductPlacementTool } from '../tools/product-placement'
import { VideoGenTool } from '../tools/video-gen'
import type { WorkflowDefinition } from '../../types'

export const LipstickPromoWorkflow: WorkflowDefinition = {
  id: 'lipstick-promo',
  code: 'lipstick-promo',
  name: '口红带货视频',
  description: '生成口红带货视频，包含人物生成、商品植入、视频合成',
  version: '1.0',
  nodes: [
    { id: 'generate_character', tool: LipstickCharacterTool },
    { id: 'place_product', tool: ProductPlacementTool },
    { id: 'generate_video', tool: VideoGenTool },
  ],
  edges: [
    { from: 'generate_character', fromPort: 'posedCharacter', to: 'place_product', toPort: 'character' },
    { from: 'place_product', fromPort: 'composed', to: 'generate_video', toPort: 'character' },
  ],
}
