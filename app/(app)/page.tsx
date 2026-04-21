'use client'

import Link from 'next/link'
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
