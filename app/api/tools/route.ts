// app/api/tools/route.ts
import { NextResponse } from 'next/server'
import { ImageBlendTool } from '@/domains/video-generation/tools/image-blend'
import { SceneReplaceTool } from '@/domains/video-generation/tools/scene-replace'
import { ImageToVideoTool } from '@/domains/video-generation/tools/image-to-video'
import { MotionTransferTool } from '@/domains/video-generation/tools/motion-transfer'
import { MultiImageEditTool } from '@/domains/video-generation/tools/multi-image-edit'
import { ModelImageTool } from '@/domains/video-generation/tools/model-image'
import { StyleImageTool } from '@/domains/video-generation/tools/style-image'

const tools = [
  {
    id: ImageBlendTool.id,
    name: '双图编辑',
    description: '输入两张图片和多张副图，生成编辑后的图片',
    icon: '🖼️',
    gradient: 'from-rose-400 to-pink-500',
    href: '/tools/image-blend',
    inputs: ImageBlendTool.inputs,
    outputs: ImageBlendTool.outputs,
  },
  {
    id: MultiImageEditTool.id,
    name: '多图编辑',
    description: '输入多张图片，生成编辑后的图片',
    icon: '📸',
    gradient: 'from-cyan-400 to-blue-500',
    href: '/products',
    inputs: MultiImageEditTool.inputs,
    outputs: MultiImageEditTool.outputs,
  },
  {
    id: ModelImageTool.id,
    name: '模特图生成',
    description: '结合虚拟IP全身图和产品图生成模特图',
    icon: '👗',
    gradient: 'from-violet-400 to-purple-500',
    href: '/tools/model-image',
    inputs: ModelImageTool.inputs,
    outputs: ModelImageTool.outputs,
  },
  {
    id: StyleImageTool.id,
    name: '定妆图生成',
    description: '结合模特图和姿势、妆容、饰品生成定妆图',
    icon: '💄',
    gradient: 'from-emerald-400 to-teal-500',
    href: '/products',
    inputs: StyleImageTool.inputs,
    outputs: StyleImageTool.outputs,
  },
  {
    id: SceneReplaceTool.id,
    name: '场景替换',
    description: '将人物与场景融合，生成首帧图',
    icon: '🌄',
    gradient: 'from-orange-400 to-amber-500',
    href: '/products',
    inputs: SceneReplaceTool.inputs,
    outputs: SceneReplaceTool.outputs,
  },
  {
    id: ImageToVideoTool.id,
    name: '图生视频',
    description: '输入首帧图和动作文字描述，生成视频',
    icon: '🎬',
    gradient: 'from-pink-400 to-rose-500',
    href: '/products',
    inputs: ImageToVideoTool.inputs,
    outputs: ImageToVideoTool.outputs,
  },
  {
    id: MotionTransferTool.id,
    name: '动作迁移',
    description: '输入首帧图和动作视频，生成带动作的视频',
    icon: '🏃',
    gradient: 'from-blue-400 to-indigo-500',
    href: '/products',
    inputs: MotionTransferTool.inputs,
    outputs: MotionTransferTool.outputs,
  },
]

// GET /api/tools
export async function GET() {
  return NextResponse.json(tools)
}
