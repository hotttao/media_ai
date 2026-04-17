'use client'

import { ChatWindow } from '@/components/home/ChatWindow'
import { VideoToolCard } from '@/components/home/VideoToolCard'
import { PromptElementsBar } from '@/components/home/PromptElementsBar'

const videoTools = [
  {
    id: '1',
    title: '口红带货视频',
    description: '生成口红带货视频，包含人物生成、商品植入、视频合成',
    href: '/workflows/lipstick-promo/wizard',
    gradient: 'from-rose-400 to-pink-500',
    icon: '💄',
  },
  {
    id: '2',
    title: '护肤推广视频',
    description: '生成护肤产品推广视频，展示产品功效和使用场景',
    href: '/workflows/skincare-promo/wizard',
    gradient: 'from-cyan-400 to-blue-500',
    icon: '✨',
  },
  {
    id: '3',
    title: '香水推广视频',
    description: '生成香水推广视频，营造优雅氛围和品牌调性',
    href: '/workflows/perfume-promo/wizard',
    gradient: 'from-violet-400 to-purple-500',
    icon: '🌸',
  },
  {
    id: '4',
    title: '人设介绍视频',
    description: '生成虚拟IP人设介绍视频，展示角色特点和背景故事',
    href: '/workflows/persona-intro/wizard',
    gradient: 'from-emerald-400 to-teal-500',
    icon: '👤',
  },
  {
    id: '5',
    title: '每日分享视频',
    description: '生成每日分享类视频，适合社交媒体日常内容更新',
    href: '/workflows/daily-share/wizard',
    gradient: 'from-orange-400 to-amber-500',
    icon: '📱',
  },
  {
    id: '6',
    title: '多IP联动视频',
    description: '生成多虚拟IP联动视频，适合品牌合作和联动活动',
    href: '/workflows/multi-ip/wizard',
    gradient: 'from-pink-400 to-rose-500',
    icon: '🎭',
  },
]

export default function HomePage() {
  return (
    <div className="p-6 space-y-6">
      {/* Chat Window */}
      <div className="h-[35vh] min-h-[280px] max-h-[350px]">
        <ChatWindow />
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
