// app/api/tools/route.ts
import { NextResponse } from 'next/server'
import { SceneReplaceTool } from '@/domains/video-generation/tools/scene-replace'
import { ImageToVideoTool } from '@/domains/video-generation/tools/image-to-video'
import { MotionTransferTool } from '@/domains/video-generation/tools/motion-transfer'
import { ModelImageTool } from '@/domains/video-generation/tools/model-image'
import { StyleImageTool } from '@/domains/video-generation/tools/style-image'

const tools = [
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
    href: '/tools/style-image',
    inputs: StyleImageTool.inputs,
    outputs: StyleImageTool.outputs,
  },
  {
    id: SceneReplaceTool.id,
    name: '场景替换',
    description: '将人物与场景融合，生成首帧图',
    icon: '🌄',
    gradient: 'from-orange-400 to-amber-500',
    href: '/tools/first-frame',
    inputs: SceneReplaceTool.inputs,
    outputs: SceneReplaceTool.outputs,
  },
  {
    id: 'jimeng-image',
    name: '即梦生图',
    description: '选择人物、服装、姿势、场景生成首帧图',
    icon: '✨',
    gradient: 'from-yellow-400 to-orange-500',
    href: '/tools/jimeng-image',
  },
  {
    id: 'jimeng-video',
    name: '即梦生视频',
    description: '选择首帧图和动作生成即梦视频',
    icon: '🎬',
    gradient: 'from-pink-400 to-rose-500',
    href: '/tools/jimeng-video',
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
