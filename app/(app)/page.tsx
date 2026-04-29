'use client'

import Link from 'next/link'
import { ChatWindow } from '@/components/home/ChatWindow'
import { VideoToolCard } from '@/components/home/VideoToolCard'
import { PromptElementsBar } from '@/components/home/PromptElementsBar'

const videoTools = [
  {
    id: '3',
    title: '模特图生成',
    description: '结合虚拟 IP 全身图和商品图生成模特图',
    href: '/tools',
    gradient: 'from-violet-400 to-purple-500',
    icon: '👗',
  },
  {
    id: '4',
    title: '定妆图生成',
    description: '结合模特图与姿势、妆容、饰品生成定妆图',
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
    description: '输入首帧图和动作描述，生成视频',
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
    title: '商品库',
    description: '管理商品素材',
    href: '/products',
    gradient: 'from-violet-500 to-purple-500',
    icon: '📦',
  },
  {
    id: 'materials',
    title: '素材库',
    description: '管理图片与视频素材',
    href: '/materials',
    gradient: 'from-teal-500 to-cyan-500',
    icon: '🧰',
  },
  {
    id: 'ips',
    title: '虚拟 IP',
    description: '管理虚拟人物',
    href: '/ips',
    gradient: 'from-pink-500 to-rose-500',
    icon: '👤',
  },
  {
    id: 'videos',
    title: '视频库',
    description: '查看所有已生成视频',
    href: '/videos',
    gradient: 'from-matcha-500 to-emerald-500',
    icon: '🎬',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-[35vh] min-h-[280px] max-h-[350px]">
        <ChatWindow />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickAccess.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`
                relative overflow-hidden rounded-2xl p-5
                bg-gradient-to-br ${item.gradient}
                text-white shadow-lg transition-transform hover:scale-[1.02]
              `}
            >
              <div className="mb-2 text-3xl">{item.icon}</div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-white/80">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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

      <PromptElementsBar />
    </div>
  )
}
