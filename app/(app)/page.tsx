'use client'

import Link from 'next/link'
import { ChatWindow } from '@/components/home/ChatWindow'
import { VideoToolCard } from '@/components/home/VideoToolCard'
import { PromptElementsBar } from '@/components/home/PromptElementsBar'

// PRD 4.3 定义的工具
const videoTools = [
  {
    id: '1',
    title: '双图编辑',
    description: '输入两张图片和多张副图，生成编辑后的图片',
    href: '/tools',
    gradient: 'from-rose-400 to-pink-500',
    icon: '🖼️',
  },
  {
    id: '2',
    title: '多图编辑',
    description: '输入多张图片，生成编辑后的图片',
    href: '/tools',
    gradient: 'from-cyan-400 to-blue-500',
    icon: '📸',
  },
  {
    id: '3',
    title: '模特图生成',
    description: '结合虚拟IP全身图和产品图生成模特图',
    href: '/tools',
    gradient: 'from-violet-400 to-purple-500',
    icon: '👗',
  },
  {
    id: '4',
    title: '定妆图生成',
    description: '结合模特图和姿势、妆容、饰品生成定妆图',
    href: '/tools',
    gradient: 'from-emerald-400 to-teal-500',
    icon: '💄',
  },
  {
    id: '5',
    title: '场景替换',
    description: '将人物与场景融合，生成首帧图',
    href: '/tools',
    gradient: 'from-orange-400 to-amber-500',
    icon: '🌄',
  },
  {
    id: '6',
    title: '图生视频',
    description: '输入首帧图和动作文字描述，生成视频',
    href: '/videos',
    gradient: 'from-pink-400 to-rose-500',
    icon: '🎬',
  },
  {
    id: '7',
    title: '动作迁移',
    description: '输入首帧图和动作视频，生成带动作的视频',
    href: '/videos',
    gradient: 'from-blue-400 to-indigo-500',
    icon: '🏃',
  },
]

const quickAccess = [
  {
    id: 'products',
    title: '产品库',
    description: '管理产品素材库',
    href: '/products',
    gradient: 'from-violet-500 to-purple-500',
    icon: '📦',
  },
  {
    id: 'materials',
    title: '素材库',
    description: '管理视频素材',
    href: '/materials',
    gradient: 'from-teal-500 to-cyan-500',
    icon: '🖼️',
  },
  {
    id: 'ips',
    title: '虚拟IP',
    description: '管理虚拟人物',
    href: '/ips',
    gradient: 'from-pink-500 to-rose-500',
    icon: '👤',
  },
]

export default function HomePage() {
  return (
    <div className="p-6 space-y-6">
      {/* Chat Window */}
      <div className="h-[35vh] min-h-[280px] max-h-[350px]">
        <ChatWindow />
      </div>

      {/* Quick Access Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickAccess.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`
                relative overflow-hidden rounded-2xl p-5
                bg-gradient-to-br ${item.gradient}
                text-white shadow-lg hover:scale-[1.02] transition-transform
              `}
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-white/80 mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Video Tools Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {videoTools.map((tool) => (
            <VideoToolCard
              key={tool.id}
              id={tool.id}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              gradient={tool.gradient}
              icon={tool.icon}
            />
          ))}
        </div>
      </div>

      {/* Prompt Elements Bar */}
      <PromptElementsBar />
    </div>
  )
}
